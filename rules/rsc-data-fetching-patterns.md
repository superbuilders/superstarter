---
description:
globs: src/app/**/*.tsx
alwaysApply: false
---

### React Server Components Data Fetching Patterns

#### ⚠️ CRITICAL: Server Components Must NOT be `async`

The fundamental rule for data fetching in React Server Components (RSCs) is that they are **categorically forbidden** from being marked as `async`. An `async` component is a function that returns a `Promise<JSX.Element>`, which completely negates the primary benefits of RSCs: streaming rendering and parallel data fetching. Instead of awaiting data, you must initiate fetches, pass the resulting `Promise` objects to child components, and let React's `<Suspense>` orchestrate the rendering.

### Core Principles

1.  **No `async` Components:** A page or layout server component must never have the `async` keyword.

2.  **Colocate Queries & Export Types:** Drizzle-prepared statements **must** be colocated in the same file as the page or layout component that initiates the fetch. This improves maintainability and clarity. You **must** also export the derived data type for use in child components using the `Awaited<ReturnType<typeof queryName.execute>>[number]` pattern.

3.  **Initiate Fetches & Pass Promises:** The parent server component should initiate all required data fetches. It should **NOT** `await` these fetches. The resulting `Promise` objects must be passed directly as props to the child components that will render the data. This allows data fetching to happen in parallel.

4.  **Handle `params` as Promises:** In Next.js 15+, the `params` and `searchParams` objects passed to page components are themselves `Promise` objects. You cannot access their values directly. To use a route parameter in a query, you must chain off the `params` promise using `.then()`.

5.  **⚠️ CRITICAL: Components Using `React.use()` Must Be Client Components:** Any component that directly calls the `React.use()` hook to consume a promise **MUST** be a Client Component, marked with the `"use client"` directive at the top of the file. Although `React.use()` can suspend rendering on the server during the initial RSC pass, the hook itself is only permitted within the client component model. This enforces a clean separation of concerns: Server Components initiate and pass promises, while dedicated child Client Components consume them.

6.  **Consume Promises with `React.use()`:** Inside the child **Client Component**, use the `React.use()` hook to read the value from the promise. This hook seamlessly integrates with Suspense, telling React to pause rendering of _only that component_ until the data is resolved.

7.  **Place Suspense deliberately — boundary identity determines behavior.** Where you place `<React.Suspense>` is a critical architectural decision. A Suspense boundary that **persists** across navigations keeps old content visible during transitions. A Suspense boundary that **remounts** with each page always shows its fallback first. See the deep dive in "Suspense Boundary Identity" below. You must choose the right placement based on whether your routes share a visual container with animated transitions.

### ⚠️ CRITICAL: Suspense Boundary Identity

This is the single most important concept in this document. Misunderstanding it causes subtle, hard-to-debug visual artifacts that are invisible during development but visible the moment you add ViewTransitions.

#### The Rule

**Suspense boundaries have identity.** Two `<Suspense>` tags that are syntactically identical are different instances if they mount at different times. React's behavior depends entirely on whether a Suspense boundary is **new** (just mounted) or **existing** (already displaying content):

| Boundary state                         | What React does when children suspend                | Why                                       |
| -------------------------------------- | ---------------------------------------------------- | ----------------------------------------- |
| **New** (just mounted)                 | Shows fallback immediately                           | No "already revealed content" to preserve |
| **Existing** (already showing content) | Keeps old content visible (inside `startTransition`) | Avoids hiding already revealed content    |

From the React docs:

> _"A Transition doesn't wait for all content to load. It only waits long enough to avoid hiding already revealed content. However, the nested Suspense boundary around Albums is **new**, so the Transition doesn't wait for it."_

#### Why This Is a Footgun

This behavior is invisible in normal rendering. When a new Suspense boundary shows `fallback={null}` for one frame before content appears, no one notices — the empty frame is imperceptible.

But two things make it visible:

1. **ViewTransitions capture intermediate states as snapshots.** The View Transition API takes a screenshot of the "old" state and a screenshot of the "new" state, then animates between them. If the "new" state is an empty fallback (because a new Suspense boundary just mounted), the animation shows: old content → empty → new content. That empty frame becomes the ghost artifact.

2. **`fallback={null}` is not "no fallback."** It means "render nothing." A new Suspense boundary with `fallback={null}` will render an empty DOM subtree before its children resolve. This is by design — React has no other content to show for a brand-new boundary.

#### How Next.js Routing Interacts with Suspense Identity

Next.js wraps all route navigations in `startTransition`. This means:

- **Existing Suspense boundaries** keep old content visible during navigation (the `startTransition` behavior)
- **New Suspense boundaries** show their fallback immediately (transitions don't help new boundaries)

When each `page.tsx` contains its own `<Suspense>`:

```
Route /a → /b (different page.tsx files):
1. Old page.tsx unmounts → its <Suspense> is DESTROYED
2. New page.tsx mounts  → a NEW <Suspense> instance is created
3. New instance has no "already revealed content"
4. New instance shows fallback immediately (null = empty)
5. Content resolves → replaces fallback
```

When navigating within the same `page.tsx` (e.g., different params):

```
Route /a/1 → /a/2 (same page.tsx, different params):
1. Same page.tsx re-renders → same <Suspense> instance PERSISTS
2. Existing instance has "already revealed content" (the /a/1 content)
3. startTransition keeps old content visible while /a/2 loads
4. Content resolves → smoothly replaces old content
```

This is why step-to-step navigations work perfectly but route-to-route navigations show ghosts.

#### The ViewTransition Interaction

From the React ViewTransition docs:

> _"If it's inside a new Suspense boundary instance, then the fallback is shown first. After the Suspense boundary fully loads, it triggers the ViewTransition to animate the reveal to the content."_

React's `<ViewTransition>` has two placement patterns relative to `<Suspense>`:

**"Update" pattern** — ViewTransition wraps Suspense (persistent boundary):

```tsx
<ViewTransition>
	<Suspense fallback={<A />}>
		<B />
	</Suspense>
</ViewTransition>
```

Content changes from `<A>` to `<B>` are treated as an **"update"**. Both get the same `view-transition-name`. Cross-fade by default. This is the correct pattern for route transitions.

**"Enter/Exit" pattern** — Suspense wraps ViewTransition (new boundary each time):

```tsx
<Suspense
	fallback={
		<ViewTransition>
			<A />
		</ViewTransition>
	}
>
	<ViewTransition>
		<B />
	</ViewTransition>
</Suspense>
```

Two separate ViewTransition instances. Treated as an **"exit"** of `<A>` and an **"enter"** of `<B>`. Each gets its own animation.

#### Three Rules for Suspense Placement

1. **Routes sharing a visual container with ViewTransition:** Suspense goes in the **layout** (persistent). Pages have NO Suspense.
2. **Independent pages without shared transitions:** Suspense goes in each **page.tsx** (per-page). Standard `page.tsx` + `content.tsx` pattern.
3. **Never put Suspense in a page.tsx that lives under a ViewTransition layout.** This creates a new boundary instance per route and causes ghost artifacts.

### Pattern 1: Layout Suspense (Animated Routes)

Use this when multiple routes share a visual container (card, panel, sidebar) with `<React.ViewTransition>` animations between them.

#### Architecture

```
src/app/(animated-group)/
├── layout.tsx        // Server Component: ViewTransition + persistent Suspense
├── route-a/
│   └── page.tsx      // "use client": React.use(params) + render
└── route-b/
    └── page.tsx      // "use client": React.use(params) + render
```

The layout owns both the ViewTransition and the Suspense boundary. Pages are `"use client"` components that call `React.use(params)` to unwrap params. The suspension from `React.use()` is caught by the persistent Suspense in the layout.

#### Example: Animated Card Layout

**layout.tsx** — Persistent Suspense + ViewTransition:

```typescript
import * as React from "react"
import { Card, CardContent } from "@/components/ui/card"

function DeckLayout({ children }: { children: React.ReactNode }) {
	return (
		<main className="flex min-h-dvh items-center justify-center px-6 py-16">
			<React.ViewTransition update="page-pan">
				<div className="w-full max-w-xl">
					<Card className="relative w-full shadow-md">
						<CardContent className="p-8">
							<React.Suspense fallback={null}>
								{children}
							</React.Suspense>
						</CardContent>
					</Card>
				</div>
			</React.ViewTransition>
		</main>
	)
}

export default DeckLayout
```

**page.tsx** — `"use client"`, no Suspense, no content.tsx:

```typescript
"use client"

import * as React from "react"
import { notFound } from "next/navigation"
import { getInstanceById } from "@/lib/data"
import { PreviewCard } from "@/components/preview-card"

function TutorialPage({ params }: { params: Promise<{ id: string }> }) {
	const { id: instanceId } = React.use(params)

	const instance = getInstanceById(instanceId)
	if (!instance) notFound()

	return <PreviewCard instance={instance} label="Learn" />
}

export default TutorialPage
```

**Why this works:**

- The Suspense boundary in layout.tsx **persists** across route changes
- When navigating `/tutorial/1` → `/tutorial/2`, the same Suspense instance stays mounted
- `startTransition` keeps old content visible while new content loads
- ViewTransition sees a content "update" (old content → new content), not an "enter" of new content from fallback
- No ghost artifacts

#### When Data is Async

If routes under a ViewTransition layout need async data (database queries), keep the layout Suspense but use the promise-drilling pattern without per-page Suspense:

```typescript
// page.tsx — Server Component, NO Suspense (layout has it)
import { Content } from "@/app/(animated)/feature/[id]/content"

function Page({ params }: { params: Promise<{ id: string }> }) {
	const dataPromise = params.then(function resolve({ id }) {
		return getFeatureDetails.execute({ id }).then((results) => results[0])
	})

	// NO <React.Suspense> here — the layout's Suspense catches this
	return <Content dataPromise={dataPromise} />
}

export default Page
```

```typescript
// content.tsx — "use client", consumes promise
"use client"

import * as React from "react"

function Content({ dataPromise }: { dataPromise: Promise<FeatureDetails> }) {
	const data = React.use(dataPromise)
	return <div>{data.name}</div>
}

export { Content }
```

### Pattern 2: Per-Page Suspense (Independent Pages)

Use this for standalone pages that do NOT share a visual container with ViewTransition animations. This is the standard `page.tsx` + `content.tsx` pattern.

#### Architecture

```
src/app/feature/[param]/
├── page.tsx          // Server Component: data fetching + Suspense + promise orchestration
└── content.tsx       // Client Component: view logic + interactivity
```

#### `page.tsx` Responsibilities (Server Component)

1. **Colocate Prepared Statements:** All Drizzle queries used by this route
2. **Export Derived Types:** Type definitions for use in `content.tsx`
3. **Chain Promise-Based Fetches:** Transform `params` promise into data promises
4. **Own the Suspense Boundary:** Wrap `content.tsx` in `<React.Suspense>`
5. **Pass Promises as Props:** No `await`ing, just promise passing

#### Comprehensive Example

This example demonstrates fetching conversation history for a specific prospect. It correctly handles the `params` promise, chains database fetches, and demonstrates the mandatory separation between the parent Server Component and the child Client Component.

##### `src/app/(dashboard)/conversations/[prospectId]/page.tsx` (Parent Server Component)

```typescript
import * as React from "react"
import { and, desc, eq, sql } from "drizzle-orm"
import { redirect } from "next/navigation"
import { ConversationDetail } from "@/components/conversation-detail"
import { getUserId } from "@/server/auth"
import { db } from "@/server/db"
import * as schema from "@/server/db/schema"

// 1. Drizzle prepared statements are colocated with the page.
const getProspectDetails = db
	.select({
		id: schema.prospect.id,
		name: sql<string>`COALESCE(${schema.prospect.name}, 'Unnamed Customer')`,
		email: schema.prospect.email,
		phone: schema.prospect.phone,
		createdAt: schema.prospect.createdAt
	})
	.from(schema.prospect)
	.where(eq(schema.prospect.id, sql.placeholder("prospectId")))
	.limit(1)
	.prepare("app_dashboard_conversations_prospectid_page_get_prospect_details")

const getConversationMessages = db
	.select({
		id: schema.message.id,
		content: schema.message.content,
		source: schema.message.source,
		createdAt: schema.message.createdAt,
		userId: schema.message.userId
	})
	.from(schema.message)
	.where(
		and(
			eq(schema.message.prospectId, sql.placeholder("prospectId")),
			eq(schema.message.userId, sql.placeholder("userId"))
		)
	)
	.orderBy(desc(schema.message.createdAt))
	.prepare("app_dashboard_conversations_prospectid_page_get_conversation_messages")

// 2. Types are derived from the queries and exported for child components.
export type ProspectDetails = Awaited<ReturnType<typeof getProspectDetails.execute>>[number]
export type ConversationMessage = Awaited<ReturnType<typeof getConversationMessages.execute>>[number]

// 3. The page component is NOT async and accepts params as a Promise.
export default function Page({
	params
}: {
	params: Promise<{ prospectId: string }>
}) {
	const prospectIdPromise = params.then((params) => params.prospectId)
	const userIdPromise = getUserId()

	const prospectPromise = prospectIdPromise.then((prospectId) =>
		getProspectDetails
			.execute({ prospectId })
			.then((results) => results[0])
			.then((prospect) => {
				if (!prospect) {
					redirect("/conversations")
				}
				return prospect
			})
	)

	const messagesPromise = Promise.all([prospectIdPromise, userIdPromise]).then(
		([prospectId, userId]) => getConversationMessages.execute({ prospectId, userId })
	)

	return (
		// 4. Per-page Suspense is OK here — no ViewTransition layout above this.
		<React.Suspense fallback={<div>Loading conversation...</div>}>
			<ConversationDetail
				prospectPromise={prospectPromise}
				messagesPromise={messagesPromise}
			/>
		</React.Suspense>
	)
}
```

##### `src/components/conversation-detail.tsx` (Child Client Component)

```typescript
"use client"

import * as React from "react"
import { Search, MessageCircle, Phone, Mail } from "lucide-react"
import type { ProspectDetails, ConversationMessage } from "@/app/(dashboard)/conversations/[prospectId]/page"
import { SearchBar } from "@/components/search-bar"

function ConversationDetail(props: {
	prospectPromise: Promise<ProspectDetails>
	messagesPromise: Promise<ConversationMessage[]>
}) {
	const prospect = React.use(props.prospectPromise)
	const messages = React.use(props.messagesPromise)

	const [searchTerm, setSearchTerm] = React.useState("")

	const filteredMessages = messages.filter(function matchesSearch(message) {
		return message.content.toLowerCase().includes(searchTerm.toLowerCase())
	})

	return (
		<div className="space-y-6">
			<div className="flex justify-between items-center">
				<div>
					<h1 className="text-2xl font-bold flex items-center gap-2">
						<MessageCircle size={24} />
						Conversation with {prospect.name}
					</h1>
				</div>
				<SearchBar
					placeholder="Search messages..."
					value={searchTerm}
					onChange={setSearchTerm}
					icon={<Search size={20} />}
				/>
			</div>
			<div className="space-y-4">
				{filteredMessages.map(function renderMessage(message) {
					return <div key={message.id}>{message.content}</div>
				})}
			</div>
		</div>
	)
}

export { ConversationDetail }
```

### Choosing the Right Pattern

Before adding Suspense to a page, ask: **"Does this page live under a layout with `<React.ViewTransition>`?"**

| Question                                          | Answer  | Pattern                                                      |
| ------------------------------------------------- | ------- | ------------------------------------------------------------ |
| Is there a `<ViewTransition>` in a parent layout? | **Yes** | Layout Suspense (Pattern 1)                                  |
| Is there a `<ViewTransition>` in a parent layout? | **No**  | Per-page Suspense (Pattern 2)                                |
| Is the data synchronous (static JSON, in-memory)? | **Yes** | `"use client"` page with `React.use(params)`, no content.tsx |
| Is the data async (database, API)?                | **Yes** | Promise-drilling with content.tsx                            |

**Decision flowchart:**

```
Does a parent layout have <ViewTransition>?
├── YES → Suspense goes in the LAYOUT, not in page.tsx
│   ├── Sync data?  → "use client" page, React.use(params), no content.tsx
│   └── Async data? → Server page.tsx (no Suspense) + content.tsx
└── NO  → Suspense goes in PAGE.TSX (standard pattern)
    └── page.tsx (with Suspense) + content.tsx
```

### Anti-Patterns to Avoid

#### ❌ WRONG: `async` Server Component with `await`

This pattern is strictly prohibited. It blocks the entire page from rendering until all data is fetched, negates streaming, and prevents parallel data fetching.

```typescript
// ❌ ANTI-PATTERN: DO NOT DO THIS
export default async function Page({
	params
}: {
	params: Promise<{ prospectId: string }>
}) {
	// ❌ ILLEGAL: `await`ing the params blocks rendering and streaming.
	const { prospectId } = await params
	// ❌ Second await cannot start until the first one is complete (waterfall).
	const userId = await getUserId()
	// ❌ Third await creates a waterfall effect.
	const prospect = await getProspectDetails.execute({ prospectId })

	// The page cannot be sent to the client until all fetches are done.
	return (
		<main>
			<ConversationDisplay prospect={prospect} />
		</main>
	)
}
```

#### ❌ WRONG: Using `React.use()` in a Server Component

This is also prohibited. `React.use()` is only permitted in Client Components.

```typescript
// ❌ ANTI-PATTERN: DO NOT DO THIS
// This is a Server Component (no "use client" directive)
export default function MyServerComponent({ dataPromise }: { dataPromise: Promise<Data> }) {
    // ❌ ILLEGAL: `React.use` cannot be called in a Server Component.
    const data = React.use(dataPromise);

    return <div>{data.name}</div>
}
```

#### ❌ WRONG: Per-Page Suspense Inside a ViewTransition Layout

This is the ghost card footgun. Each `page.tsx` creates a **new** Suspense boundary instance on every route navigation. The new instance shows its fallback (`null` = empty) before content resolves. ViewTransition captures that empty state and animates it as a ghost.

```typescript
// layout.tsx — has ViewTransition wrapping children
function Layout({ children }: { children: React.ReactNode }) {
	return (
		<React.ViewTransition update="page-pan">
			<div className="container">{children}</div>
		</React.ViewTransition>
	)
}

// page.tsx — ❌ WRONG: creates NEW Suspense instance per route
function Page({ params }: { params: Promise<{ id: string }> }) {
	const dataPromise = params.then(/* ... */)
	return (
		<React.Suspense fallback={null}>  {/* ← DESTROYED and RECREATED on every navigation */}
			<Content dataPromise={dataPromise} />
		</React.Suspense>
	)
}
```

**What happens on navigation `/a` → `/b`:**

1. Page `/a` unmounts → its `<Suspense>` instance is destroyed
2. Page `/b` mounts → a **new** `<Suspense>` instance is created
3. The new instance has no "already revealed content" — it's brand new
4. React shows `fallback={null}` immediately (empty DOM)
5. ViewTransition captures: screenshot of `/a` content → screenshot of empty fallback
6. Browser animates: old content slides away, empty card appears
7. Content resolves → replaces fallback (too late, the ghost already flashed)

**The fix:** Move Suspense into the layout. The boundary persists. React keeps old content visible during transitions.

```typescript
// layout.tsx — ✅ CORRECT: Suspense is persistent, inside ViewTransition
function Layout({ children }: { children: React.ReactNode }) {
	return (
		<React.ViewTransition update="page-pan">
			<div className="container">
				<React.Suspense fallback={null}>
					{children}
				</React.Suspense>
			</div>
		</React.ViewTransition>
	)
}

// page.tsx — ✅ CORRECT: no Suspense, "use client"
"use client"
function Page({ params }: { params: Promise<{ id: string }> }) {
	const { id } = React.use(params)
	// ... render directly
}
```

#### ❌ WRONG: Suspense Outside ViewTransition

If Suspense wraps ViewTransition (instead of ViewTransition wrapping Suspense), the animation semantics change. Content transitions become "exit old + enter new" instead of "update," which can produce unexpected animations.

```typescript
// ❌ WRONG: Suspense wraps ViewTransition — creates exit/enter instead of update
<React.Suspense fallback={null}>
	<React.ViewTransition update="page-pan">
		{children}
	</React.ViewTransition>
</React.Suspense>

// ✅ CORRECT: ViewTransition wraps Suspense — creates update animation
<React.ViewTransition update="page-pan">
	<React.Suspense fallback={null}>
		{children}
	</React.Suspense>
</React.ViewTransition>
```

From the React ViewTransition docs, the "Update" pattern requires ViewTransition to be the outer wrapper:

```tsx
<ViewTransition>
	<Suspense fallback={<A />}>
		<B />
	</Suspense>
</ViewTransition>
```

> _"In this scenario when the content goes from A to B, it'll be treated as an 'update'"_

### Suspense Reference: Key Behaviors

Quick reference for how Suspense behaves in different scenarios. All of these assume Next.js routing (which uses `startTransition` for navigations).

#### New Boundary (just mounted)

```
State: Component tree mounts with a new <Suspense>
Behavior: Fallback shown IMMEDIATELY, regardless of startTransition
Reason: No "already revealed content" exists to preserve
Danger: fallback={null} = empty frame captured by ViewTransition
```

#### Existing Boundary (re-render with new data)

```
State: Same <Suspense> instance, children suspend again
Behavior: Old content stays visible (inside startTransition)
Reason: startTransition preserves "already revealed content"
Safe: ViewTransition sees old content → new content, smooth animation
```

#### Existing Boundary (without startTransition)

```
State: Same <Suspense> instance, children suspend outside transition
Behavior: Fallback REPLACES old content
Reason: Without transition, React has no instruction to preserve old content
Note: This doesn't happen with Next.js routing (always uses startTransition)
```

#### Boundary with `key` prop change

```
State: <Suspense key={id}> where id changes between renders
Behavior: Treated as a NEW boundary (key change = unmount + remount)
Danger: Same ghost artifact as per-page Suspense
Avoid: Don't put changing keys on Suspense boundaries under ViewTransition
```
