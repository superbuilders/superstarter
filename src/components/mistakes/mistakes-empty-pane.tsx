// <MistakesEmptyPane> — rendered on /mistakes when the user has no
// unresolved mistakes to redrill. Mirrors the EmptyBankPane shape.

import type * as React from "react"
import { Button } from "@/components/ui/button"

function MistakesEmptyPane() {
	const Anchor: React.ElementType = "a"
	return (
		<main
			className="mx-auto flex min-h-dvh max-w-md flex-col justify-center gap-6 px-6 py-12"
			data-testid="mistakes-empty-pane"
		>
			<header className="space-y-2">
				<h1 className="font-semibold text-2xl tracking-tight">
					No mistakes to review.
				</h1>
				<p className="text-muted-foreground text-sm">
					You're all caught up. Try a drill from the dashboard to make some new ones.
				</p>
			</header>
			<div>
				<Button asChild size="lg">
					<Anchor href="/">Back to dashboard</Anchor>
				</Button>
			</div>
		</main>
	)
}

export { MistakesEmptyPane }
