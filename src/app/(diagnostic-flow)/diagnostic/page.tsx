// /diagnostic — pre-diagnostic explainer page.
//
// Phase 3 polish commit 3 split the original /diagnostic into an
// explainer (this file) + the actual session route (`/diagnostic/run`).
// See docs/plans/phase-3-polish-practice-surface-features.md §6.1.
//
// Server component, NOT async per
// rules/rsc-data-fetching-patterns.md. The (app)/layout.tsx diagnostic
// gate's redirect target stays `/diagnostic` — users who haven't
// completed a diagnostic land here first, read the framing, then click
// "Start Diagnostic" to enter the session at `/diagnostic/run`.
//
// No `alpha-style` skin (parent-plan §11 forward note: focus-shell-
// aesthetic family). Match the focus-shell's typographic register —
// foreground / muted-foreground / subtle borders — so the visual
// transition into `/diagnostic/run` is continuous.

// Use `<Link>` (not plain `<a>`) so the click on "Start Diagnostic"
// stays an SPA navigation. Plain-`<a>` triggers a full-page reload,
// which destroys the prior document's transient user activation;
// the new `/diagnostic/run` document then has no active user-gesture,
// and the FocusShell's audio-ticker cannot create / resume the
// AudioContext until the user happens to interact with the new
// document — which the natural test condition (read Q1 silently,
// let the threshold tick fire from the timer alone) explicitly
// precludes. SPA navigation keeps the same document, preserves the
// transient user activation window (~5s), and lets the FocusShell's
// mount-time `unlockAudio()` calls fire within the gesture window.
//
// Historical note (preserved per closed-plan-immutable, the pre-fix
// state): an earlier author used `<a>` with a comment citing
// typed-routes forward-reference rejection — the route was added in
// the same commit, so its typed-route entry hadn't propagated. The
// typed-routes cache has long since caught up; `<Link>` typechecks
// cleanly against `/diagnostic/run` now.

import Link from "next/link"

function Page() {
	return (
		<main className="mx-auto flex min-h-dvh w-full max-w-2xl flex-col items-stretch justify-center px-6 py-16">
			<header className="space-y-3">
				<h1 className="font-semibold text-3xl tracking-tight">Welcome to the diagnostic.</h1>
				<p className="text-foreground/70 text-sm">Read this once. It will not be shown again.</p>
			</header>

			<ul className="mt-10 space-y-4 text-base">
				<li className="flex items-start gap-3">
					<span
						aria-hidden="true"
						className="mt-2 inline-block h-1.5 w-1.5 shrink-0 rounded-full bg-foreground/60"
					/>
					<span>
						<strong className="font-semibold">50 questions in 15 minutes.</strong> This is the same
						pacing the real CCAT uses.
					</span>
				</li>
				<li className="flex items-start gap-3">
					<span
						aria-hidden="true"
						className="mt-2 inline-block h-1.5 w-1.5 shrink-0 rounded-full bg-foreground/60"
					/>
					<span>
						The diagnostic measures{" "}
						<strong className="font-semibold">
							how many you can answer accurately in 15 minutes
						</strong>{" "}
						— pace yourself and move on when a question stalls.
					</span>
				</li>
				<li className="flex items-start gap-3">
					<span
						aria-hidden="true"
						className="mt-2 inline-block h-1.5 w-1.5 shrink-0 rounded-full bg-foreground/60"
					/>
					<span>
						You are not expected to finish all 50.{" "}
						<strong className="font-semibold">That's by design.</strong> The clock is the test; what
						you finish is your baseline.
					</span>
				</li>
			</ul>

			<div className="mt-12">
				<Link
					href="/diagnostic/run"
					className="inline-flex w-full items-center justify-center rounded-md bg-primary px-6 py-4 font-medium text-base text-primary-foreground transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
				>
					Start Diagnostic
				</Link>
			</div>
		</main>
	)
}

export default Page
