"use client"

import * as React from "react"
import { useSearchParams } from "next/navigation"
import {
	FOCUS_PREFS_STORAGE_KEY,
	FOCUS_TUTORIAL_LOCAL_STORAGE_KEY,
	FOCUS_TUTORIAL_SESSION_STORAGE_KEY,
	shouldShowTutorialOnNextRunState,
	useFocusPrefs
} from "@/components/focus-shell/focus-prefs"
import { FocusTutorialBeforePrimerGate } from "@/components/focus-shell/focus-shell"

function TutorialGateSmokeClientPage() {
	const searchParams = useSearchParams()
	const [mounted, setMounted] = React.useState(false)
	const rawUserKey = searchParams.get("user")
	let userKey: string | undefined
	if (rawUserKey !== null) {
		const trimmedUserKey = rawUserKey.trim()
		if (trimmedUserKey.length > 0) {
			userKey = trimmedUserKey
		}
	}
	const {
		tutorialLocal,
		tutorialSession,
		setTutorialEnabledForNextRun,
		completeTutorialDismissal,
		clearTutorialSessionForLoginReset
	} = useFocusPrefs(userKey)

	const gateOpen = shouldShowTutorialOnNextRunState(tutorialSession, tutorialLocal)

	React.useEffect(function markMounted() {
		setMounted(true)
	}, [])

	return (
		<main className="mx-auto flex min-h-dvh max-w-5xl flex-col gap-6 px-6 py-10">
			<header className="space-y-2">
				<h1 className="font-semibold text-2xl tracking-tight">Tutorial Gate Smoke</h1>
				<p className="max-w-3xl text-foreground/70 text-sm">
					This route mounts the real tutorial gate against a simple primer shell so the
					gating state can be verified without auth.
				</p>
				<p data-testid="current-user" className="text-sm text-text-2">
					Current smoke user: {userKey === undefined ? "(unscoped legacy browser state)" : userKey}
				</p>
			</header>

			<section className="rounded-2xl border border-foreground/10 bg-background p-5 shadow-sm">
				<div className="flex flex-wrap items-center gap-4">
					<label className="flex items-center gap-2 text-sm">
						<input
							data-testid="manual-toggle"
							type="checkbox"
							checked={tutorialSession.showOnNextRun}
							onChange={function onChange(event) {
								setTutorialEnabledForNextRun(event.currentTarget.checked)
							}}
						/>
						Show tutorial on next run
					</label>
					<button
						type="button"
						data-testid="dismiss-tutorial"
						onClick={completeTutorialDismissal}
						className="rounded-md border border-foreground/15 px-3 py-1.5 text-sm"
					>
						Mark tutorial completed
					</button>
					<button
						type="button"
						data-testid="reset-login"
						onClick={clearTutorialSessionForLoginReset}
						className="rounded-md border border-foreground/15 px-3 py-1.5 text-sm"
					>
						Reset login session
					</button>
				</div>

				<pre
					data-testid="tutorial-state"
					className="mt-4 overflow-auto rounded-xl bg-foreground/[0.03] p-4 text-xs leading-6"
				>
					{mounted
						? JSON.stringify(
								{
									userKey,
									storageKeys: {
										focusPrefs: FOCUS_PREFS_STORAGE_KEY,
										tutorialLocal: FOCUS_TUTORIAL_LOCAL_STORAGE_KEY,
										tutorialSession: FOCUS_TUTORIAL_SESSION_STORAGE_KEY
									},
									tutorialLocal,
									tutorialSession,
									gateOpen
								},
								null,
								2
							)
						: "loading client tutorial state..."}
				</pre>
			</section>

			<section className="rounded-2xl border border-foreground/20 border-dashed p-6">
				<FocusTutorialBeforePrimerGate userKey={userKey}>
					<div
						data-testid="primer-content"
						className="rounded-2xl border border-emerald-300 bg-emerald-50 p-8 text-emerald-950 shadow-sm"
					>
						<h2 className="font-semibold text-lg">Practice Test primer content</h2>
						<p className="mt-2 max-w-xl text-sm">
							If this panel is visible, the tutorial gate allowed the primer through.
						</p>
					</div>
				</FocusTutorialBeforePrimerGate>
			</section>
		</main>
	)
}

function TutorialGateSmokePage() {
	return (
		<React.Suspense fallback={null}>
			<TutorialGateSmokeClientPage />
		</React.Suspense>
	)
}

export default TutorialGateSmokePage
