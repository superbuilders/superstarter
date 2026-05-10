// <ProvenanceTab> — sibling-set + parent + generator-metadata + validator-
// flags surface. The densest tab; the one that lets admin answer "why did
// the validator flag this?" and "what cohort is this part of?"
//
// Layout:
//   1. Generator metadata block (model, template version, prompt hash,
//      generated-at, validator-thresholds-hash, invoked-by-admin email).
//   2. Validator flag detail — per-criterion verdict (pass/flag/error)
//      with reason + metadata for flagged criteria. The most actionable
//      content for admin disposition decisions.
//   3. Parent block (link to /admin/review/<parentItemId>; parent's body
//      preview + correctAnswer). Falls back to "(parent missing)" when
//      candidate.metadata.parentItemId references a deleted row.
//   4. Sibling list — each sibling row shows tier + status + flag-count
//      + correctAnswer + first-N-chars of body. Currently-viewed candidate
//      highlighted with cobalt accent.
//   5. Provenance file path display — admin can read the raw JSON via
//      filesystem if needed; surfaced as monospace.

import * as React from "react"
import { subTypes } from "@/config/sub-types"
import type {
	AdminCandidateRow,
	AdminItemDetail,
	ProvenanceSnapshot
} from "@/server/admin/item-detail-data"
import type { ValidatorVerdict } from "@/server/admin/validator-result-schema"

const SUB_TYPE_NAMES: ReadonlyMap<string, string> = new Map(
	subTypes.map(function toEntry(s) {
		return [s.id, s.displayName]
	})
)

const BODY_PREVIEW_MAX = 100

function truncate(text: string): string {
	if (text.length <= BODY_PREVIEW_MAX) return text
	return `${text.slice(0, BODY_PREVIEW_MAX)}…`
}

function bodyTextOf(candidate: AdminCandidateRow): string {
	if (candidate.body.kind === "text") return candidate.body.text
	return ""
}

function flagCountOf(candidate: AdminCandidateRow): number {
	const result = candidate.metadata.validatorResult
	if (result === undefined) return 0
	let n = 0
	for (const v of Object.values(result.flagsByName)) {
		if (v.kind === "flag" || v.kind === "error") n += 1
	}
	return n
}

interface ProvenanceTabProps {
	readonly detail: AdminItemDetail
}

function MetadataBlock({ candidate }: { candidate: AdminCandidateRow }) {
	const md = candidate.metadata
	const validator = md.validatorResult
	const generatedAt = md.generatedAt === undefined ? "—" : md.generatedAt
	const generatorModel = md.generatorModel === undefined ? "—" : md.generatorModel
	const templateVersion = md.templateVersion === undefined ? "—" : String(md.templateVersion)
	const promptHash = md.promptHash === undefined ? "—" : md.promptHash
	const thresholdsHash = validator === undefined ? "—" : validator.thresholdsHash
	const invokedBy = validator === undefined ? "—" : validator.invokedByAdminEmail
	const evaluatedAt =
		validator === undefined ? "—" : new Date(validator.evaluatedAtMs).toISOString()
	const rows: ReadonlyArray<{ label: string; value: string }> = [
		{ label: "Generator model", value: generatorModel },
		{ label: "Template version", value: templateVersion },
		{ label: "Generated at", value: generatedAt },
		{ label: "Prompt hash", value: promptHash },
		{ label: "Validator thresholds", value: thresholdsHash },
		{ label: "Validator invoked by", value: invokedBy },
		{ label: "Validator evaluated at", value: evaluatedAt }
	]
	return (
		<section className="overflow-hidden rounded-lg border border-border-soft bg-surface">
			<header className="flex items-baseline justify-between border-border-soft border-b px-4 pt-2 pb-1">
				<h3 className="font-medium font-serif text-[15px] text-text-1 tracking-[-0.005em]">
					Generator + validator metadata
				</h3>
				<span className="text-[11px] text-text-3 uppercase tracking-[0.06em]">
					Audit trail
				</span>
			</header>
			<dl className="grid grid-cols-1 gap-y-2 px-4 py-3 md:grid-cols-[200px_1fr]">
				{rows.map(function renderRow(row) {
					return (
						<React.Fragment key={row.label}>
							<dt className="text-[11px] text-text-3 uppercase tracking-[0.06em]">
								{row.label}
							</dt>
							<dd className="break-all font-mono text-[12px] text-text-1 tabular-nums">
								{row.value}
							</dd>
						</React.Fragment>
					)
				})}
			</dl>
		</section>
	)
}

function VerdictBadge({ verdict }: { verdict: ValidatorVerdict }) {
	if (verdict.kind === "pass") {
		return (
			<span className="inline-flex items-center rounded-sm border border-border-soft bg-surface-2 px-[6px] py-[1px] font-medium text-[10px] text-text-2 uppercase tracking-[0.06em]">
				Pass
			</span>
		)
	}
	if (verdict.kind === "error") {
		return (
			<span className="inline-flex items-center rounded-sm border border-border-strong bg-surface-2 px-[6px] py-[1px] font-medium text-[10px] text-text-3 uppercase tracking-[0.06em]">
				Error
			</span>
		)
	}
	return (
		<span className="inline-flex items-center rounded-sm bg-lavender px-[6px] py-[1px] font-medium text-[10px] text-indigo uppercase tracking-[0.06em]">
			Flag
		</span>
	)
}

function FlagDetail({ name, verdict }: { name: string; verdict: ValidatorVerdict }) {
	if (verdict.kind === "pass") {
		return (
			<li className="flex items-center justify-between gap-3 border-border-soft border-b px-4 py-2 text-[13px] text-text-2 last:border-b-0">
				<span className="font-mono text-[12px] text-text-2">{name}</span>
				<VerdictBadge verdict={verdict} />
			</li>
		)
	}
	const metadataEntries =
		verdict.kind === "flag"
			? Object.entries(verdict.metadata).map(function toEntry(entry) {
					return { key: entry[0], value: JSON.stringify(entry[1]) }
				})
			: []
	return (
		<li className="flex flex-col gap-2 border-border-soft border-b px-4 py-3 last:border-b-0">
			<div className="flex items-center justify-between gap-3">
				<span className="font-mono text-[12px] text-text-1">{name}</span>
				<VerdictBadge verdict={verdict} />
			</div>
			<p className="text-[13px] text-text-2 leading-relaxed">{verdict.reason}</p>
			{metadataEntries.length > 0 ? (
				<dl className="grid grid-cols-[160px_1fr] gap-x-2 gap-y-1 rounded-md bg-surface-2 px-3 py-2 font-mono text-[11px] text-text-2 tabular-nums">
					{metadataEntries.map(function renderEntry(entry) {
						return (
							<React.Fragment key={entry.key}>
								<dt className="text-text-3">{entry.key}</dt>
								<dd className="break-all text-text-1">{entry.value}</dd>
							</React.Fragment>
						)
					})}
				</dl>
			) : null}
		</li>
	)
}

function ValidatorFlagsBlock({ candidate }: { candidate: AdminCandidateRow }) {
	const validator = candidate.metadata.validatorResult
	const entries =
		validator === undefined
			? []
			: Object.entries(validator.flagsByName).map(function toEntry(e) {
					return { name: e[0], verdict: e[1] }
				})
	let body: React.ReactNode
	if (entries.length === 0) {
		body = (
			<p className="px-4 py-3 text-[13px] text-text-3 italic">
				No validator run recorded for this candidate.
			</p>
		)
	} else {
		body = (
			<ul className="divide-none">
				{entries.map(function renderEntry(entry) {
					return <FlagDetail key={entry.name} name={entry.name} verdict={entry.verdict} />
				})}
			</ul>
		)
	}
	return (
		<section className="overflow-hidden rounded-lg border border-border-soft bg-surface">
			<header className="flex items-baseline justify-between border-border-soft border-b px-4 pt-2 pb-1">
				<h3 className="font-medium font-serif text-[15px] text-text-1 tracking-[-0.005em]">
					Validator flags
				</h3>
				<span className="text-[11px] text-text-3 uppercase tracking-[0.06em]">
					Per criterion
				</span>
			</header>
			{body}
		</section>
	)
}

function ParentBlock({
	parent,
	parentItemId
}: {
	parent?: AdminCandidateRow
	parentItemId?: string
}) {
	let body: React.ReactNode
	if (parentItemId === undefined) {
		body = (
			<p className="px-4 py-3 text-[13px] text-text-3 italic">
				This candidate has no recorded parentItemId.
			</p>
		)
	} else if (parent === undefined) {
		body = (
			<p className="px-4 py-3 text-[13px] text-text-3 italic">
				Parent item <span className="font-mono">{parentItemId}</span> not found in the bank.
			</p>
		)
	} else {
		const parentSubType = SUB_TYPE_NAMES.get(parent.subTypeId)
		const parentSubTypeDisplay = parentSubType === undefined ? parent.subTypeId : parentSubType
		body = (
			<div className="flex flex-col gap-2 px-4 py-3">
				<div className="flex flex-wrap items-center gap-3 text-[12px]">
					<span className="font-mono text-text-3">{parent.id}</span>
					<span className="text-text-2">{parentSubTypeDisplay}</span>
					<span className="text-text-3 capitalize">{parent.difficulty}</span>
					<span className="inline-flex items-center rounded-sm border border-border-soft bg-surface-2 px-[6px] py-[1px] font-medium text-[10px] text-text-2 uppercase tracking-[0.06em]">
						{parent.status}
					</span>
				</div>
				<p className="text-[13px] text-text-1">{truncate(bodyTextOf(parent))}</p>
				<a
					href={`/admin/review/${parent.id}`}
					className="self-start text-[12px] text-cobalt hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-cobalt focus-visible:outline-offset-1"
				>
					Open parent →
				</a>
			</div>
		)
	}
	return (
		<section className="overflow-hidden rounded-lg border border-border-soft bg-surface">
			<header className="flex items-baseline justify-between border-border-soft border-b px-4 pt-2 pb-1">
				<h3 className="font-medium font-serif text-[15px] text-text-1 tracking-[-0.005em]">
					Parent item
				</h3>
				<span className="text-[11px] text-text-3 uppercase tracking-[0.06em]">
					Source for sibling generation
				</span>
			</header>
			{body}
		</section>
	)
}

function SiblingsBlock({
	siblings,
	currentId
}: {
	siblings: ReadonlyArray<AdminCandidateRow>
	currentId: string
}) {
	let body: React.ReactNode
	if (siblings.length === 0) {
		body = (
			<p className="px-4 py-3 text-[13px] text-text-3 italic">
				No siblings recorded for this candidate's parent.
			</p>
		)
	} else {
		body = (
			<ul className="divide-none">
				{siblings.map(function renderSibling(sibling) {
					const isCurrent = sibling.id === currentId
					const containerClass = isCurrent
						? "grid grid-cols-[80px_60px_60px_1fr] items-start gap-3 border-border-soft border-b bg-lavender px-4 py-2 text-sm last:border-b-0"
						: "grid grid-cols-[80px_60px_60px_1fr] items-start gap-3 border-border-soft border-b px-4 py-2 text-sm last:border-b-0"
					const currentMarker = isCurrent ? (
						<span className="inline-flex items-center rounded-sm bg-cobalt px-[6px] py-[1px] font-medium text-[10px] text-white uppercase tracking-[0.06em]">
							Viewing
						</span>
					) : null
					const flagCountValue = flagCountOf(sibling)
					const flagBadge =
						flagCountValue > 0 ? (
							<span className="inline-flex items-center rounded-sm bg-lavender px-[6px] py-[1px] font-medium text-[10px] text-indigo uppercase tracking-[0.06em]">
								{flagCountValue} flag{flagCountValue === 1 ? "" : "s"}
							</span>
						) : null
					return (
						<li key={sibling.id} className={containerClass}>
							<span className="text-[12px] text-text-3 capitalize">{sibling.difficulty}</span>
							<span className="inline-flex items-center justify-center rounded-sm border border-border-soft bg-surface-2 px-[6px] py-[2px] font-medium text-[10px] text-text-2 uppercase tracking-[0.06em]">
								{sibling.status}
							</span>
							<span className="flex flex-wrap items-center gap-2">
								{currentMarker}
								{flagBadge}
							</span>
							<a
								href={`/admin/review/${sibling.id}`}
								className="min-w-0 truncate text-[13px] text-text-1 hover:underline"
							>
								{truncate(bodyTextOf(sibling))}
							</a>
						</li>
					)
				})}
			</ul>
		)
	}
	return (
		<section className="overflow-hidden rounded-lg border border-border-soft bg-surface">
			<header className="flex items-baseline justify-between border-border-soft border-b px-4 pt-2 pb-1">
				<h3 className="font-medium font-serif text-[15px] text-text-1 tracking-[-0.005em]">
					Sibling set
				</h3>
				<span className="text-[11px] text-text-3 uppercase tracking-[0.06em]">
					{siblings.length} candidates from same parent
				</span>
			</header>
			{body}
		</section>
	)
}

function ProvenanceFileBlock({
	snapshot,
	parentItemId
}: {
	snapshot?: ProvenanceSnapshot
	parentItemId?: string
}) {
	let body: React.ReactNode
	if (parentItemId === undefined) {
		body = (
			<p className="px-4 py-3 text-[13px] text-text-3 italic">
				No provenance file (candidate has no parentItemId).
			</p>
		)
	} else if (snapshot === undefined) {
		body = (
			<p className="px-4 py-3 text-[13px] text-text-3 italic">
				Provenance file <span className="font-mono">scripts/_siblings/{parentItemId}.json</span>{" "}
				not found on disk.
			</p>
		)
	} else {
		const siblingRowsDisplay =
			snapshot.siblings === undefined ? "—" : String(snapshot.siblings.length)
		body = (
			<dl className="grid grid-cols-[200px_1fr] gap-x-2 gap-y-1 px-4 py-3 font-mono text-[12px] text-text-1 tabular-nums">
				<dt className="text-[11px] text-text-3 uppercase tracking-[0.06em]">Provenance file</dt>
				<dd className="break-all text-text-1">scripts/_siblings/{parentItemId}.json</dd>
				<dt className="text-[11px] text-text-3 uppercase tracking-[0.06em]">Sibling rows</dt>
				<dd className="text-text-1">{siblingRowsDisplay}</dd>
			</dl>
		)
	}
	return (
		<section className="overflow-hidden rounded-lg border border-border-soft bg-surface">
			<header className="flex items-baseline justify-between border-border-soft border-b px-4 pt-2 pb-1">
				<h3 className="font-medium font-serif text-[15px] text-text-1 tracking-[-0.005em]">
					Provenance file
				</h3>
				<span className="text-[11px] text-text-3 uppercase tracking-[0.06em]">
					On-disk audit trail
				</span>
			</header>
			{body}
		</section>
	)
}

function ProvenanceTab({ detail }: ProvenanceTabProps) {
	const candidate = detail.candidate
	const parentItemId = candidate.metadata.parentItemId
	return (
		<div className="flex flex-col gap-4">
			<MetadataBlock candidate={candidate} />
			<ValidatorFlagsBlock candidate={candidate} />
			<ParentBlock parent={detail.parent} parentItemId={parentItemId} />
			<SiblingsBlock siblings={detail.siblings} currentId={candidate.id} />
			<ProvenanceFileBlock snapshot={detail.provenanceSnapshot} parentItemId={parentItemId} />
		</div>
	)
}

export type { ProvenanceTabProps }
export { ProvenanceTab }
