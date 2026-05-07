// /full-length/configure — full-length test configure pane.
// docs/plans/phase5-full-length-test.md §5 + Q12.6.
//
// Server component, bare primer pane (no length-picker, no sub-type-
// picker — v1 ships fixed at 50 questions × 15 minutes
// cross-sub-type-interleaved per PRD §4.5). The page is a thin
// commitment-confirmation layer: the user clicks the Mastery Map
// secondary CTA, lands here, reads the test framing, then explicitly
// chooses to start. Mirrors the drill configure page's form-submit
// shape but omits the length picker.
//
// Inherits the (app) layout's auth + diagnostic-completed gate; full-
// length is post-onboarding by definition (cannot be reached before
// the diagnostic completes).

import { Button } from "@/components/ui/button"

const RUN_PATH = "/full-length/run"

function Page() {
	return (
		<main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center gap-8 px-6 py-12">
			<header className="space-y-2">
				<h1 className="font-semibold text-2xl tracking-tight">Full-length test</h1>
				<p className="text-muted-foreground text-sm">
					50 questions in 15 minutes. Real-test difficulty mix, randomized across
					verbal and numerical sub-types. Lands on the post-session review on
					completion or timeout.
				</p>
			</header>
			<form action={RUN_PATH} method="get" className="space-y-6">
				<div className="flex justify-end">
					<Button type="submit" size="lg">
						Start full-length test
					</Button>
				</div>
			</form>
		</main>
	)
}

export default Page
