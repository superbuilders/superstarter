---
description:
globs: packages/product/nextjs-app/src/app/**/*.tsx
alwaysApply: false
---

# React Server Components Data Fetching

## Pages are not async

A page or layout is never `async`. tsgo `asyncFunction` refuses `async` everywhere. An async component holds the whole response until every `await` settles, and it runs reads one after another that could have run together. A page starts its reads, passes the promises down, and lets `<Suspense>` decide what streams when.

## The shape

- **The read** is an Effect exported from a `server-only` module under the app's `src/server/<area>/`, such as `readTodos` in `packages/product/nextjs-app/src/server/todos/todos.ts`. Its row type is the result Schema of the prepared statement it runs (`Todo` in `@superstarter/database/queries/todos`), which decodes every row once.
- **The page** is a server component. It turns the read into a promise with `connection().then(() => runRenderRead(read))` and passes the promise as a prop.
  - `connection()` holds the read until a request arrives, so a build never opens a database session and the page shell prerenders around the fallback.
  - `runRenderRead` runs the Effect under the server's web telemetry.
- **The view** is a `"use client"` component that calls `use(promise)`. It imports the row type with `import type` from the query module, never a server module's values.
- **The Suspense boundary** wraps the view, in the page or in the layout (see [placement](#suspense-boundary-identity)).

`src/app/page.tsx`, with imports omitted:

```tsx
/** `connection()` holds the read until a request arrives, so a build never opens a database
 * session and the page shell prerenders around the list's fallback. */
const todosOfRequest = () => connection().then(() => runRenderRead(readTodos))

export default function TodosPage() {
	return (
		<main data-slot="todos-page" className="mx-auto max-w-lg p-8">
			<Card>
				<CardHeader>
					<CardTitle>Todos</CardTitle>
				</CardHeader>
				<CardContent>
					<Suspense fallback={<p className="text-muted-foreground text-sm">Loading…</p>}>
						<TodoList todos={todosOfRequest()} />
					</Suspense>
				</CardContent>
			</Card>
		</main>
	)
}
```

`src/app/todo-list.tsx`:

```tsx
"use client"

import { use } from "react"
import type { Todo } from "@superstarter/database/queries/todos"

export function TodoList({ todos }: Readonly<{ todos: Promise<ReadonlyArray<Todo>> }>) {
	const saved = use(todos)
	// …
}
```

`use()` runs only in client components; a server component never calls it. Components are function declarations, and props are `Readonly<{…}>`.

## Several reads

Start every read before passing any of them down, so they run in parallel:

```tsx
export default function DashboardPage() {
	const todos = connection().then(() => runRenderRead(readTodos))
	const totals = connection().then(() => runRenderRead(readTotals))
	return (
		<Suspense fallback={<DashboardSkeleton />}>
			<Dashboard todos={todos} totals={totals} />
		</Suspense>
	)
}
```

## Route params

`params` and `searchParams` are promises. Chain the read off them, and never await them:

```tsx
const todoOfRequest = (params: Promise<Readonly<{ id: string }>>) =>
	params.then(({ id }) => runRenderRead(readTodo(id)))

export default function TodoPage({ params }: Readonly<{ params: Promise<{ id: string }> }>) {
	return (
		<Suspense fallback={<TodoSkeleton />}>
			<TodoDetail todo={todoOfRequest(params)} />
		</Suspense>
	)
}
```

The read decodes the raw `id` with `Schema.decodeEffect(TodoId)` before it reaches SQL ([effect-schema.md](effect-schema.md)).

## Mutations

A mutation is a server action in a `"use server"` module named `*-actions.ts`, such as `packages/product/nextjs-app/src/server/todos/todo-actions.ts`. It has three parts:

- **The contract** lives in browser-safe code (`@superstarter/todo-protocol/todo-contracts`): the action's name from the `SERVER_ACTIONS` roster, and Schemas for its payload, its success and its errors. Both sides of the wire use the one definition.
- **The action** is `effectAction(contract, handler)` (`packages/product/nextjs-app/src/server/effect-action.ts`). It returns a plain function, not an `async` one, which Next accepts as a `"use server"` export. Export only values built by `effectAction` from these modules. The wrapper decodes the payload, runs the handler's Effect inside one `superstarter.action` span, and answers the encoded `Exit`. A failure the contract names crosses as itself when it is the run's only reason, and a Next signal (`redirect`, `notFound`) leaves as itself. Anything else, a refusal beside another failure included, is reported once and crosses as the opaque `ActionFailed`. The handler calls `revalidatePath` so the page's read runs again.
- **The client** builds an Effect per action with the app's `callAction(contract, action)` (`#lib/action-client.ts`): the protocol's `makeActionClient`, given Next's signal recognizer (`#lib/next-signal.ts`, which the server's wrapper uses too). It calls it inside `startTransition`, applies the change at once with `useOptimistic`, and turns a failure into a notice by looking its `_tag` up in a table typed over every refusal:

```ts
// src/server/todos/todo-actions.ts
export const toggleTodo = effectAction(ToggleTodo, (id) =>
	flipTodo(id).pipe(retryPostgresTransient, Effect.andThen(revalidateList))
)
```

```tsx
// src/app/todo-list.tsx
const callToggle = callAction(ToggleTodo, toggleTodo)

const toggle = (todo: Todo): void => {
	startTransition(() => {
		applyOptimistic({ kind: "toggle", id: todo.id })
		return noticeOnSettle(callToggle(todo.id))
	})
}
```

`callAction` fails with `ActionUnconfirmed` when the request never answered: the page went away, or the request failed in transit. The change may or may not have landed, so the client never retries it on its own. When the action called `redirect()` or `notFound()`, the rejection is Next's own signal: `callAction` raises it again as a defect, the transition rejects with it, and Next's boundary navigates. A defect rejects the transition and reaches the route's error boundary.

A form submits through `onSubmit` with `preventDefault`, not through a form action: the draft then clears as a discrete update the input shows at once, so a second Enter finds it empty instead of submitting the same todo again.

## Suspense boundary identity

A Suspense boundary has identity. Two `<Suspense>` tags written the same way are different instances if they mount at different times, and React treats them differently:

| Boundary                               | When its children suspend                                              |
| -------------------------------------- | ---------------------------------------------------------------------- |
| **New** (just mounted)                 | Shows its fallback at once, because it has no revealed content to keep |
| **Existing** (already showing content) | Keeps the old content visible, inside a transition                     |

Next wraps every navigation in `startTransition`, so the difference shows on navigation:

- **Within one `page.tsx`** (`/todos/1` to `/todos/2`): the page re-renders, its Suspense instance persists, and the old content stays until the new content is ready.
- **Between two `page.tsx` files** (`/a` to `/b`): the old page's Suspense is destroyed and the new page mounts a new one. That boundary shows its fallback first. `fallback={null}` renders an empty subtree.

Without view transitions the empty frame is invisible. A `<ViewTransition>` snapshots the old state and the new state and animates between them. When the new state is a fresh boundary's empty fallback, the animation runs old content, then empty, then new content: a ghost.

### Placement rules

1. **Routes that share a visual container with a `<ViewTransition>`:** the Suspense boundary goes in the **layout**, inside the `<ViewTransition>`. Pages have no Suspense.
2. **Independent pages:** the Suspense boundary goes in each `page.tsx`. `src/app/page.tsx` follows this rule.
3. **Never** put Suspense in a `page.tsx` under a ViewTransition layout, and never put a changing `key` on a Suspense boundary under one. Either one mounts a new boundary on every navigation.

`<ViewTransition>` wraps `<Suspense>`, never the reverse. With `<ViewTransition>` outside, the change from fallback to content is an _update_ of one element, a cross-fade by default. With `<Suspense>` outside, it is an _exit_ of the fallback and an _enter_ of the content, each animated separately.

### Layout Suspense

```tsx
import { type ReactNode, Suspense, ViewTransition } from "react"
import { Card, CardContent } from "#ui/card.tsx"

export default function DeckLayout({ children }: Readonly<{ children: ReactNode }>) {
	return (
		<main className="flex min-h-dvh items-center justify-center px-6 py-16">
			<ViewTransition update="page-pan">
				<div className="w-full max-w-xl">
					<Card>
						<CardContent>
							<Suspense fallback={null}>{children}</Suspense>
						</CardContent>
					</Card>
				</div>
			</ViewTransition>
		</main>
	)
}
```

**A page with synchronous data** under this layout is a `"use client"` page that unwraps `params` with `use()`. The layout's boundary catches the suspension:

```tsx
"use client"

import { notFound } from "next/navigation"
import { use } from "react"

export default function CardPage({ params }: Readonly<{ params: Promise<{ id: string }> }>) {
	const { id } = use(params)
	const card = cardOf(id)
	if (card === undefined) {
		notFound()
	}
	return <PreviewCard card={card} />
}
```

**A page with database data** under this layout is a server page with no Suspense. It passes the promise to a client view:

```tsx
export default function CardPage({ params }: Readonly<{ params: Promise<{ id: string }> }>) {
	const card = params.then(({ id }) => runRenderRead(readCard(id)))
	return <CardView card={card} />
}
```

## Anti-patterns

```tsx
// BAD: an async page awaits, blocking the stream and serializing reads
export default async function TodosPage() {
	const todos = await runRenderRead(readTodos)
	return <TodoList todos={todos} />
}

// BAD: use() in a server component
export default function TodosPage({ todos }: Readonly<{ todos: Promise<ReadonlyArray<Todo>> }>) {
	const rows = use(todos)
	return <TodoRows rows={rows} />
}

// BAD: per-page Suspense under a ViewTransition layout mounts a new boundary per route
export default function CardPage({ params }: Readonly<{ params: Promise<{ id: string }> }>) {
	const card = params.then(({ id }) => runRenderRead(readCard(id)))
	return (
		<Suspense fallback={null}>
			<CardView card={card} />
		</Suspense>
	)
}

// BAD: Suspense outside ViewTransition turns an update into exit and enter
<Suspense fallback={null}>
	<ViewTransition update="page-pan">{children}</ViewTransition>
</Suspense>
```
