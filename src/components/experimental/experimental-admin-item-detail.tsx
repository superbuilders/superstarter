"use client"

import * as React from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { subTypes } from "@/config/sub-types"
import { logger } from "@/logger"
import { moderateExperimentalItemAction } from "@/server/experimental/admin-moderation-actions"
import type {
	ExperimentalAdminAuditAggregate,
	ExperimentalAdminDecisionHistoryEntry,
	ExperimentalAdminItemDetail,
	ExperimentalAdminProposal
} from "@/server/experimental/admin-data"

interface ExperimentalAdminItemDetailViewProps {
	detail: ExperimentalAdminItemDetail | null
}

type ModerationDecision = "approve_as_is" | "approve_edit" | "reject" | "needs_revision" | "hide"

type AuditStatCard = {
	label: string
	stat: ExperimentalAdminAuditAggregate["makesSense"]
}

const subTypeLabelEntries: ReadonlyArray<readonly [string, string]> = subTypes.map(function mapSubType(subType) {
	return [subType.id, subType.displayName]
})

const subTypeLabelById = new Map<string, string>(subTypeLabelEntries)

function displaySubTypeLabel(subTypeId: string): string {
	const label = subTypeLabelById.get(subTypeId)
	if (label === undefined) return subTypeId
	return label
}

function formatWhen(ms: number | undefined): string {
	if (ms === undefined) return "—"
	return new Intl.DateTimeFormat("en-US", {
		month: "short",
		day: "numeric",
		year: "numeric",
		hour: "numeric",
		minute: "2-digit"
	}).format(new Date(ms))
}

function decisionLabel(decision: ModerationDecision): string {
	if (decision === "approve_as_is") return "Approve as-is"
	if (decision === "approve_edit") return "Approve edited proposal"
	if (decision === "reject") return "Reject"
	if (decision === "needs_revision") return "Needs revision"
	return "Hide from circulation"
}

function decisionDescription(entry: ExperimentalAdminDecisionHistoryEntry): string {
	if (entry.decision === "approve_edit") {
		if (entry.proposalId === undefined) return "Approved an edited proposal."
		return `Approved edited proposal ${entry.proposalId}.`
	}
	if (entry.decision === "approve_as_is") return "Approved the original experimental item as-is."
	if (entry.decision === "reject") return "Rejected the experimental item."
	if (entry.decision === "needs_revision") return "Returned the item for revision."
	return "Removed the item from Experimental circulation."
}

function proposalSummary(proposal: ExperimentalAdminProposal): string {
	const parts: string[] = []
	if (proposal.suggestedSubject !== undefined) {
		parts.push(`subject ${displaySubTypeLabel(proposal.suggestedSubject)}`)
	}
	if (proposal.suggestedDifficulty !== undefined) {
		parts.push(`difficulty ${proposal.suggestedDifficulty}`)
	}
	if (parts.length === 0) return "No subject or difficulty suggestion"
	return parts.join(" · ")
}

function proposalIdForDecision(
	decision: ModerationDecision,
	selectedProposalId: string | undefined
): string | undefined {
	if (decision !== "approve_edit") return undefined
	return selectedProposalId
}

function normalizeDecisionNotes(decisionNotes: string): string | undefined {
	const trimmed = decisionNotes.trim()
	if (trimmed.length === 0) return undefined
	return trimmed
}

function initialDecisionHistory(
	detail: ExperimentalAdminItemDetail | null
): ReadonlyArray<ExperimentalAdminDecisionHistoryEntry> {
	if (detail === null) return []
	return detail.decisions
}

function AuditAggregateSection(props: { aggregate: ExperimentalAdminAuditAggregate }) {
	const auditCards: ReadonlyArray<AuditStatCard> = [
		{ label: "Makes sense", stat: props.aggregate.makesSense },
		{ label: "Correct answer", stat: props.aggregate.correctAnswerIsRight },
		{ label: "Subject tag", stat: props.aggregate.subjectTagIsRight },
		{ label: "Difficulty", stat: props.aggregate.difficultyIsRight }
	]
	return (
		<section className="rounded-2xl border border-border-soft bg-panel px-5 py-5 shadow-sm">
			<h2 className="font-medium font-serif text-[20px] text-text-1">Audit aggregate</h2>
			<p className="mt-2 text-sm text-text-2">
				{props.aggregate.totalAudits} audit submissions · {props.aggregate.notesCount} notes
			</p>
			<div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
				{auditCards.map(function renderStat(card) {
					return (
						<div
							key={card.label}
							className="rounded-xl border border-border-soft bg-bg px-4 py-4 text-sm text-text-2"
						>
							<p className="text-[11px] text-text-3 uppercase tracking-[0.06em]">
								{card.label}
							</p>
							<p className="mt-2">
								Yes {card.stat.yes} · No {card.stat.no} · Blank {card.stat.blank}
							</p>
						</div>
					)
				})}
			</div>
			<div className="mt-4 grid gap-4 md:grid-cols-2">
				<div className="rounded-xl border border-border-soft bg-bg px-4 py-4">
					<p className="text-[11px] text-text-3 uppercase tracking-[0.06em]">
						Suggested subjects
					</p>
					{props.aggregate.suggestedSubjects.length === 0 ? (
						<p className="mt-2 text-sm text-text-3">No subject suggestions yet.</p>
					) : (
						<ul className="mt-2 space-y-1 text-sm text-text-2">
							{props.aggregate.suggestedSubjects.map(function renderSubject(subject) {
								return (
									<li key={subject.subTypeId}>
										{displaySubTypeLabel(subject.subTypeId)} · {subject.count}
									</li>
								)
							})}
						</ul>
					)}
				</div>
				<div className="rounded-xl border border-border-soft bg-bg px-4 py-4">
					<p className="text-[11px] text-text-3 uppercase tracking-[0.06em]">
						Suggested difficulties
					</p>
					{props.aggregate.suggestedDifficulties.length === 0 ? (
						<p className="mt-2 text-sm text-text-3">No difficulty suggestions yet.</p>
					) : (
						<ul className="mt-2 space-y-1 text-sm text-text-2">
							{props.aggregate.suggestedDifficulties.map(function renderDifficulty(difficulty) {
								return (
									<li key={difficulty.difficulty}>
										{difficulty.difficulty} · {difficulty.count}
									</li>
								)
							})}
						</ul>
					)}
				</div>
			</div>
			<div className="mt-4 rounded-xl border border-border-soft bg-bg px-4 py-4">
				<p className="text-[11px] text-text-3 uppercase tracking-[0.06em]">Audit notes</p>
				{props.aggregate.notes.length === 0 ? (
					<p className="mt-2 text-sm text-text-3">No audit notes yet.</p>
				) : (
					<ul className="mt-3 space-y-3 text-sm text-text-2">
						{props.aggregate.notes.map(function renderNote(note) {
							return (
								<li key={note.id} className="rounded-lg border border-border-soft px-3 py-3">
									<p className="text-[11px] text-text-3 uppercase tracking-[0.06em]">
										{note.userEmail} · {formatWhen(note.submittedAtMs)}
									</p>
									<p className="mt-2 whitespace-pre-wrap">{note.notes}</p>
								</li>
							)
						})}
					</ul>
				)}
			</div>
		</section>
	)
}

function ProposalListSection(props: {
	proposals: ReadonlyArray<ExperimentalAdminProposal>
	selectedProposalId: string | undefined
	onSelectProposal: (proposalId: string) => void
}) {
	return (
		<section className="rounded-2xl border border-border-soft bg-panel px-5 py-5 shadow-sm">
			<h2 className="font-medium font-serif text-[20px] text-text-1">Edit proposals</h2>
			<p className="mt-2 text-sm text-text-2">
				Selecting and approving a proposal records the moderation decision only in this slice. It does not rewrite the experimental item or create a canonical item yet.
			</p>
			{props.proposals.length === 0 ? (
				<div className="mt-4 rounded-xl border border-border-soft border-dashed bg-bg px-4 py-5 text-sm text-text-3">
					No edit proposals yet.
				</div>
			) : (
				<div className="mt-4 space-y-4">
					{props.proposals.map(function renderProposal(proposal) {
						const isSelected = props.selectedProposalId === proposal.id
						return (
							<label
								key={proposal.id}
								className="block cursor-pointer rounded-xl border border-border-soft bg-bg px-4 py-4"
							>
								<div className="flex items-start gap-3">
									<input
										type="radio"
										name="selectedProposal"
										checked={isSelected}
										onChange={function onChange() {
											props.onSelectProposal(proposal.id)
										}}
										className="mt-1"
									/>
									<div className="min-w-0 flex-1 space-y-3">
										<div>
											<p className="text-[11px] text-text-3 uppercase tracking-[0.06em]">
												{proposal.userEmail} · {formatWhen(proposal.submittedAtMs)}
											</p>
											<p className="mt-1 text-sm text-text-2">{proposalSummary(proposal)}</p>
										</div>
										{proposal.proposedStem === undefined ? null : (
											<div>
												<p className="text-[11px] text-text-3 uppercase tracking-[0.06em]">
													Proposed stem
												</p>
												<p className="mt-1 text-sm text-text-1">{proposal.proposedStem}</p>
											</div>
										)}
										{proposal.proposedOptions === undefined ? null : (
											<div>
												<p className="text-[11px] text-text-3 uppercase tracking-[0.06em]">
													Proposed options
												</p>
												<ul className="mt-1 space-y-1 text-sm text-text-2">
													{proposal.proposedOptions.map(function renderOption(option) {
														const isCorrect = proposal.proposedCorrectAnswer === option.id
														return (
															<li key={option.id}>
																{option.id}. {option.text}
																{isCorrect ? <span className="ml-2 text-cobalt">Correct</span> : null}
															</li>
														)
													})}
												</ul>
											</div>
										)}
										{proposal.proposedExplanation === undefined ? null : (
											<div>
												<p className="text-[11px] text-text-3 uppercase tracking-[0.06em]">
													Proposed explanation
												</p>
												<p className="mt-1 text-sm text-text-2">
													{proposal.proposedExplanation}
												</p>
											</div>
										)}
										{proposal.rationale === undefined ? null : (
											<div>
												<p className="text-[11px] text-text-3 uppercase tracking-[0.06em]">
													Rationale
												</p>
												<p className="mt-1 whitespace-pre-wrap text-sm text-text-2">
													{proposal.rationale}
												</p>
											</div>
										)}
									</div>
								</div>
							</label>
						)
					})}
				</div>
			)}
		</section>
	)
}

function shouldDisableApproveEditAction(props: {
	isPending: boolean
	hasProposals: boolean
}): boolean {
	if (props.isPending) return true
	if (!props.hasProposals) return true
	return false
}

function ModerationActionsSection(props: {
	isPending: boolean
	error: string | undefined
	status: string | undefined
	decisionNotes: string
	hasProposals: boolean
	onDecisionNotesChange: (value: string) => void
	onSubmitDecision: (decision: ModerationDecision) => void
}) {
	return (
		<section className="rounded-2xl border border-border-soft bg-panel px-5 py-5 shadow-sm">
			<h2 className="font-medium font-serif text-[20px] text-text-1">Moderation actions</h2>
			<p className="mt-2 text-sm text-text-2">
				Approval and rejection update Experimental moderation state only. No canonical promotion occurs in this slice.
			</p>
			<label className="mt-4 flex flex-col gap-1 text-sm text-text-2">
				<span className="text-[11px] text-text-3 uppercase tracking-[0.06em]">Decision notes</span>
				<textarea
					value={props.decisionNotes}
					onChange={function onChange(event) {
						props.onDecisionNotesChange(event.target.value)
					}}
					rows={4}
					placeholder="Optional context for the moderation log."
					className="min-h-28 rounded-md border border-border-soft bg-bg px-3 py-2 text-sm text-text-1 focus-visible:outline focus-visible:outline-2 focus-visible:outline-cobalt focus-visible:outline-offset-2"
				/>
			</label>
			<div className="mt-4 flex flex-col gap-3">
				<Button
					type="button"
					disabled={props.isPending}
					onClick={function onClick() {
						props.onSubmitDecision("approve_as_is")
					}}
				>
					{props.isPending ? "Saving…" : "Approve as-is"}
				</Button>
				<Button
					type="button"
					variant="secondary"
					disabled={shouldDisableApproveEditAction(props)}
					onClick={function onClick() {
						props.onSubmitDecision("approve_edit")
					}}
				>
					{props.isPending ? "Saving…" : "Approve selected proposal"}
				</Button>
				<Button
					type="button"
					variant="secondary"
					disabled={props.isPending}
					onClick={function onClick() {
						props.onSubmitDecision("needs_revision")
					}}
				>
					{props.isPending ? "Saving…" : "Mark needs revision"}
				</Button>
				<Button
					type="button"
					variant="destructive"
					disabled={props.isPending}
					onClick={function onClick() {
						props.onSubmitDecision("reject")
					}}
				>
					{props.isPending ? "Saving…" : "Reject"}
				</Button>
				<Button
					type="button"
					variant="outline"
					disabled={props.isPending}
					onClick={function onClick() {
						props.onSubmitDecision("hide")
					}}
				>
					{props.isPending ? "Saving…" : "Hide from circulation"}
				</Button>
			</div>
			{props.status === undefined ? null : (
				<p className="mt-3 text-sm text-text-2">{props.status}</p>
			)}
			{props.error === undefined ? null : (
				<p className="mt-3 text-pace-over text-sm">{props.error}</p>
			)}
		</section>
	)
}

function RevisionContextSection(props: {
	detail: ExperimentalAdminItemDetail
	hiddenAtMs: number | undefined
}) {
	return (
		<section className="rounded-2xl border border-border-soft bg-panel px-5 py-5 shadow-sm">
			<h2 className="font-medium font-serif text-[20px] text-text-1">Revision context</h2>
			<dl className="mt-4 space-y-3 text-sm text-text-2">
				<div>
					<dt className="text-[11px] text-text-3 uppercase tracking-[0.06em]">
						Parent experimental item
					</dt>
					<dd className="mt-1 break-all text-text-1">
						{props.detail.parentItem === undefined ? "None" : props.detail.parentItem.id}
					</dd>
					{props.detail.parentItem === undefined ? null : (
						<p className="mt-1 text-text-2">{props.detail.parentItem.prompt}</p>
					)}
				</div>
				<div>
					<dt className="text-[11px] text-text-3 uppercase tracking-[0.06em]">Created</dt>
					<dd className="mt-1 text-text-1">{formatWhen(props.detail.item.createdAtMs)}</dd>
				</div>
				<div>
					<dt className="text-[11px] text-text-3 uppercase tracking-[0.06em]">Updated</dt>
					<dd className="mt-1 text-text-1">{formatWhen(props.detail.item.updatedAtMs)}</dd>
				</div>
				<div>
					<dt className="text-[11px] text-text-3 uppercase tracking-[0.06em]">Hidden</dt>
					<dd className="mt-1 text-text-1">
						{props.hiddenAtMs === undefined ? "No" : formatWhen(props.hiddenAtMs)}
					</dd>
				</div>
				<div>
					<dt className="text-[11px] text-text-3 uppercase tracking-[0.06em]">
						Promoted canonical item
					</dt>
					<dd className="mt-1 break-all text-text-1">
						{props.detail.item.promotedItemId === undefined
							? "None"
							: props.detail.item.promotedItemId}
					</dd>
				</div>
			</dl>
		</section>
	)
}

function DecisionHistorySection(props: {
	decisions: ReadonlyArray<ExperimentalAdminDecisionHistoryEntry>
}) {
	return (
		<section className="rounded-2xl border border-border-soft bg-panel px-5 py-5 shadow-sm">
			<h2 className="font-medium font-serif text-[20px] text-text-1">Decision history</h2>
			{props.decisions.length === 0 ? (
				<p className="mt-3 text-sm text-text-3">No moderation decisions yet.</p>
			) : (
				<ul className="mt-4 space-y-3 text-sm text-text-2">
					{props.decisions.map(function renderDecision(entry) {
						return (
							<li key={entry.id} className="rounded-xl border border-border-soft bg-bg px-4 py-4">
								<p className="text-[11px] text-text-3 uppercase tracking-[0.06em]">
									{entry.adminEmail} · {formatWhen(entry.actedAtMs)}
								</p>
								<p className="mt-2 font-medium text-text-1">{decisionLabel(entry.decision)}</p>
								<p className="mt-1">{decisionDescription(entry)}</p>
								{entry.decisionNotes === undefined ? null : (
									<p className="mt-2 whitespace-pre-wrap text-text-2">
										{entry.decisionNotes}
									</p>
								)}
							</li>
						)
					})}
				</ul>
			)}
		</section>
	)
}

function ExperimentalAdminItemDetailNotFound() {
	return (
		<div className="min-h-screen bg-bg text-text-1">
			<main className="mx-auto max-w-[1200px] px-7 pt-10 pb-12">
				<header className="mb-4 flex flex-col gap-1 border border-border-soft border-b pb-3">
					<p className="text-[11px] text-text-3 uppercase tracking-[0.06em]">Admin</p>
					<h1 className="font-medium font-serif text-[22px] text-text-1 leading-[1.15] tracking-[-0.015em]">
						Experimental moderation detail
					</h1>
				</header>
				<p className="text-sm text-text-3">No experimental item matches this id.</p>
				<div className="mt-4">
					<a href="/admin/experimental" className="text-[12px] text-cobalt hover:underline">
						← Back to Experimental moderation
					</a>
				</div>
			</main>
		</div>
	)
}

function ExperimentalAdminItemDetailResolved(props: { detail: ExperimentalAdminItemDetail }) {
	const detail = props.detail
	const [selectedProposalId, setSelectedProposalId] = React.useState<string | undefined>(
		detail.proposals[0]?.id
	)
	const [decisionNotes, setDecisionNotes] = React.useState("")
	const [auditStatus, setAuditStatus] = React.useState(detail.item.auditStatus)
	const [hiddenAtMs, setHiddenAtMs] = React.useState<number | undefined>(detail.item.hiddenAtMs)
	const [decisions, setDecisions] = React.useState<
		ReadonlyArray<ExperimentalAdminDecisionHistoryEntry>
	>(function init() {
		return initialDecisionHistory(detail)
	})
	const [error, setError] = React.useState<string | undefined>(undefined)
	const [status, setStatus] = React.useState<string | undefined>(undefined)
	const [isPending, startTransition] = React.useTransition()

	function submitDecision(decision: ModerationDecision) {
		setError(undefined)
		setStatus(undefined)
		if (decision === "approve_edit" && selectedProposalId === undefined) {
			setError("Select a proposal before approving an edited proposal.")
			return
		}
		const proposalId = proposalIdForDecision(decision, selectedProposalId)
		const normalizedDecisionNotes = normalizeDecisionNotes(decisionNotes)
		startTransition(function runModeration() {
			void moderateExperimentalItemAction({
				experimentalItemId: detail.item.id,
				decision,
				proposalId,
				decisionNotes: normalizedDecisionNotes
			})
				.then(function onSuccess(result) {
					setAuditStatus(result.auditStatus)
					setHiddenAtMs(result.hiddenAtMs)
					setDecisionNotes("")
					setStatus(`${decisionLabel(decision)} saved ${formatWhen(result.actedAtMs)}`)
					setDecisions(function update(previous) {
						return [
							{
								id: result.decisionId,
								decision: result.decision,
								adminEmail: result.actedByEmail,
								proposalId: result.proposalId,
								decisionNotes: result.decisionNotes,
								actedAtMs: result.actedAtMs
							},
							...previous
						]
					})
				})
				.catch(function onError(err: unknown) {
					logger.error(
						{ err, experimentalItemId: detail.item.id, decision },
						"ExperimentalAdminItemDetailView: moderation failed"
					)
					setError("Couldn’t save this moderation decision. Try again.")
				})
		})
	}

	return (
		<div className="min-h-screen bg-bg text-text-1">
			<main className="mx-auto max-w-[1200px] px-7 pt-10 pb-12">
				<header className="mb-4 flex flex-col gap-1 border-border-soft border-b pb-3">
					<p className="text-[11px] text-text-3 uppercase tracking-[0.06em]">Admin</p>
					<h1 className="font-medium font-serif text-[22px] text-text-1 leading-[1.15] tracking-[-0.015em]">
						Experimental moderation detail
					</h1>
					<p className="break-all font-mono text-[12px] text-text-3 tabular-nums">
						{detail.item.id}
					</p>
				</header>
				<div className="mb-4 flex flex-wrap items-center justify-between gap-3">
					<a href="/admin/experimental" className="text-[12px] text-cobalt hover:underline">
						← Back to Experimental moderation
					</a>
					<div className="flex flex-wrap items-center gap-2">
						<Badge variant={hiddenAtMs === undefined ? "secondary" : "outline"}>
							{hiddenAtMs === undefined ? auditStatus : `hidden · ${auditStatus}`}
						</Badge>
						<Badge variant="outline">{displaySubTypeLabel(detail.item.subTypeId)}</Badge>
						<Badge variant="outline">{detail.item.difficulty}</Badge>
					</div>
				</div>
				<div className="grid gap-6 xl:grid-cols-[minmax(0,2fr)_minmax(320px,1fr)]">
					<div className="space-y-6">
						<section className="rounded-2xl border border-border-soft bg-panel px-5 py-5 shadow-sm">
							<h2 className="font-medium font-serif text-[20px] text-text-1">
								Original experimental item
							</h2>
							<p className="mt-3 text-base text-text-1">{detail.item.prompt}</p>
							<ol className="mt-4 space-y-2 text-sm text-text-2">
								{detail.item.options.map(function renderOption(option) {
									const isCorrect = option.id === detail.item.correctAnswer
									return (
										<li
											key={option.id}
											className="rounded-lg border border-border-soft px-3 py-2"
										>
											<span className="font-medium text-text-1">{option.id}.</span>
											{" "}
											{option.text}
											{isCorrect ? <span className="ml-2 text-cobalt">Correct</span> : null}
										</li>
									)
								})}
							</ol>
							<div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
								<div>
									<p className="text-[11px] text-text-3 uppercase tracking-[0.06em]">
										Correct answer
									</p>
									<p className="mt-1 text-sm text-text-1">{detail.item.correctAnswerText}</p>
								</div>
								<div>
									<p className="text-[11px] text-text-3 uppercase tracking-[0.06em]">
										Source version
									</p>
									<p className="mt-1 text-sm text-text-1">{detail.item.sourceVersion}</p>
								</div>
								<div>
									<p className="text-[11px] text-text-3 uppercase tracking-[0.06em]">Hidden</p>
									<p className="mt-1 text-sm text-text-1">
										{hiddenAtMs === undefined ? "No" : formatWhen(hiddenAtMs)}
									</p>
								</div>
							</div>
							{detail.item.explanation === undefined ? null : (
								<div className="mt-4 rounded-xl border border-border-soft bg-bg px-4 py-4">
									<p className="text-[11px] text-text-3 uppercase tracking-[0.06em]">
										Explanation
									</p>
									<p className="mt-2 text-sm text-text-2">{detail.item.explanation}</p>
								</div>
							)}
						</section>
						<AuditAggregateSection aggregate={detail.auditAggregate} />
						<ProposalListSection
							proposals={detail.proposals}
							selectedProposalId={selectedProposalId}
							onSelectProposal={setSelectedProposalId}
						/>
					</div>
					<div className="space-y-6">
						<ModerationActionsSection
							isPending={isPending}
							error={error}
							status={status}
							decisionNotes={decisionNotes}
							hasProposals={detail.proposals.length > 0}
							onDecisionNotesChange={setDecisionNotes}
							onSubmitDecision={submitDecision}
						/>
						<RevisionContextSection detail={detail} hiddenAtMs={hiddenAtMs} />
						<DecisionHistorySection decisions={decisions} />
					</div>
				</div>
			</main>
		</div>
	)
}

function ExperimentalAdminItemDetailView(props: ExperimentalAdminItemDetailViewProps) {
	if (props.detail === null) return <ExperimentalAdminItemDetailNotFound />
	return <ExperimentalAdminItemDetailResolved detail={props.detail} />
}

export { ExperimentalAdminItemDetailView }
