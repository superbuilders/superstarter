"use client"

// <MasteryMap> — the home screen's fourteen-icon grid + near-goal line +
// primary CTA + low-contrast triage adherence. Plan §6.3 / PRD §5.2 /
// docs/plans/phase3-mastery-map.md §3.
//
// Reads four promises drilled in from the server `(app)/page.tsx` and
// consumes them via `React.use()`. Each promise's failure modes:
//   - `masteryStatesPromise` — empty for users who finished the
//     diagnostic but have no `mastery_state` rows yet (the
//     post-diagnostic race window between endSession and the
//     workflow's upserts). When empty, this component renders the
//     <ComputingState> empty-state pane instead of fourteen misleading
//     outlined icons; the pane's polling effect drives router.refresh()
//     until the workflow populates.
//   - `userTargetsPromise` — both fields nullable. deriveNearGoal handles
//     undefined date.
//   - `triageRolling30dPromise` — small-sample threshold handled by
//     formatLine inside <TriageAdherenceLine>.
//   - `recommendedNextSessionPromise` — always returns a sub-type id
//     (deterministic tie-break by lexicographic sub_type_id).

import * as React from "react"
import { type SubTypeConfig, subTypes } from "@/config/sub-types"
import type { TriageScore } from "@/server/triage/score"
import type { MasteryLevel } from "@/server/mastery/compute"
import type { SubTypeId } from "@/config/sub-types"
import { ComputingState } from "@/components/mastery-map/computing-state"
import { MasteryIcon } from "@/components/mastery-map/mastery-icon"
import { NearGoalLine } from "@/components/mastery-map/near-goal-line"
import { SignOutButton } from "@/components/mastery-map/sign-out-button"
import { StartSessionButton } from "@/components/mastery-map/start-session-button"
import { TriageAdherenceLine } from "@/components/mastery-map/triage-adherence-line"

interface MasteryMapProps {
	masteryStatesPromise: Promise<ReadonlyMap<SubTypeId, MasteryLevel>>
	nearGoalPromise: Promise<string>
	triagePromise: Promise<TriageScore>
	recommendedSubTypePromise: Promise<SubTypeId>
}

const VERBAL_SUB_TYPES: ReadonlyArray<SubTypeConfig> = subTypes.filter(
	function isVerbal(s) {
		return s.section === "verbal"
	}
)
const NUMERICAL_SUB_TYPES: ReadonlyArray<SubTypeConfig> = subTypes.filter(
	function isNumerical(s) {
		return s.section === "numerical"
	}
)

function MasteryMap(props: MasteryMapProps) {
	const states = React.use(props.masteryStatesPromise)
	const nearGoal = React.use(props.nearGoalPromise)
	const triage = React.use(props.triagePromise)
	const recommendedId = React.use(props.recommendedSubTypePromise)

	// Race-window branch: the (app) gate guarantees the user has a
	// completed-non-abandoned diagnostic, so an empty states map means
	// masteryRecomputeWorkflow hasn't finished upserting yet. Render the
	// computing-state pane (with polling) instead of the misleading
	// fourteen-outlined-icons render.
	if (states.size === 0) {
		return <ComputingState />
	}

	const recommendedConfig = subTypes.find(function byId(s) {
		return s.id === recommendedId
	})
	let recommendedDisplay: string = recommendedId
	if (recommendedConfig) recommendedDisplay = recommendedConfig.displayName

	return (
		<main className="mx-auto flex min-h-dvh w-full max-w-2xl flex-col gap-10 px-6 py-12">
			<header className="flex items-start justify-between gap-4">
				<div className="space-y-3">
					<h1 className="font-semibold text-2xl tracking-tight">Mastery Map</h1>
					<NearGoalLine text={nearGoal} />
				</div>
				<SignOutButton />
			</header>

			<section className="space-y-6" aria-label="mastery">
				<SubTypeRow label="Verbal" subTypes={VERBAL_SUB_TYPES} states={states} />
				<SubTypeRow label="Numerical" subTypes={NUMERICAL_SUB_TYPES} states={states} />
			</section>

			<div className="flex flex-col items-center gap-3">
				<StartSessionButton subTypeId={recommendedId} displayName={recommendedDisplay} />
			</div>

			<footer className="mt-auto pt-6">
				<TriageAdherenceLine fired={triage.fired} taken={triage.taken} ratio={triage.ratio} />
			</footer>
		</main>
	)
}

interface SubTypeRowProps {
	label: string
	subTypes: ReadonlyArray<SubTypeConfig>
	states: ReadonlyMap<SubTypeId, MasteryLevel>
}

function SubTypeRow(props: SubTypeRowProps) {
	return (
		<div className="space-y-3">
			<h2 className="font-medium text-foreground/60 text-xs uppercase tracking-widest">
				{props.label}
			</h2>
			<div className="grid grid-cols-5 gap-4 sm:grid-cols-6">
				{props.subTypes.map(function renderIcon(s) {
					return (
						<MasteryIcon
							key={s.id}
							subTypeId={s.id}
							displayName={s.displayName}
							section={s.section}
							state={props.states.get(s.id)}
						/>
					)
				})}
			</div>
		</div>
	)
}

export type { MasteryMapProps }
export { MasteryMap }
