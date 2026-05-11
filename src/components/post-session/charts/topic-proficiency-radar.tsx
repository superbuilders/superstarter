"use client"

// <TopicProficiencyRadar> — per-section spider chart of sub-type proficiency.
//
// One radar per CCAT section (verbal or numerical), driven by the canonical
// sub-types in `@/config/sub-types`. Iterating the canonical list — not just
// the rows the session produced — guarantees every sub-type in the section
// appears as an axis; sub-types the user did not attempt in this session
// render at center with a reduced-opacity label + vertex (the "you have not
// touched this yet" signal).
//
// Metric (per axis): exponential-accuracy-weighted rated score (RS):
//   accuracy = correct / total                            (in [0,1])
//   T_actual = medianLatencyMs / 1000                     (seconds)
//   RS       = (accuracy² × T_target / T_actual) × 100
//
// Squaring accuracy keeps a fast-but-wrong outlier from being "rescued"
// by speed: a user at 20% / 5s scores 0.04 × 3.6 × 100 = 14.4, while
// a target user at 80% / 18s scores 0.64 × 1.0 × 100 = 64 (the cobalt
// ring), and a master at 95% / 12s clears 135.
//
// The outer ring scale is SHARED across Verbal and Numerical radars
// (computed once in the shell via computeOuterRingValue, passed as a
// prop) so the two radars are visually comparable.

import type { PerSubTypePerformance } from "@/app/(diagnostic-flow)/post-session/[sessionId]/page"
import { type SubTypeId, subTypes } from "@/config/sub-types"
import { cn } from "@/lib/utils"

type SectionId = "verbal" | "numerical"

interface TopicProficiencyRadarProps {
	rows: ReadonlyArray<PerSubTypePerformance>
	section: SectionId
	outerRingValue: number
}

interface AxisDatum {
	subTypeId: SubTypeId
	displayName: string
	value: number
	isEmpty: boolean
	angle: number
}

const VIEW_SIZE = 280
const CENTER = VIEW_SIZE / 2
const RADIUS = 96
const LABEL_RADIUS = RADIUS + 22

const TARGET_ACCURACY = 0.8
const TARGET_PACE_SECONDS = 18
// Rated score at the brand-target (80% at 18s) — the cobalt ring sits here.
// (0.8² × 18/18) × 100 = 64.
const TARGET_RS = TARGET_ACCURACY ** 2 * 100

interface PerSubTypeMetric {
	value: number
	isEmpty: boolean
}

function metricFor(row: PerSubTypePerformance | undefined): PerSubTypeMetric {
	if (row === undefined) return { value: 0, isEmpty: true }
	if (row.total === 0) return { value: 0, isEmpty: true }
	if (row.medianLatencyMs === 0) return { value: 0, isEmpty: true }
	const accuracy = row.correct / row.total
	const tActualSeconds = row.medianLatencyMs / 1000
	const rs = accuracy ** 2 * (TARGET_PACE_SECONDS / tActualSeconds) * 100
	return { value: rs, isEmpty: false }
}

function computeOuterRingValue(rows: ReadonlyArray<PerSubTypePerformance>): number {
	let observedMax = 0
	for (const r of rows) {
		const m = metricFor(r)
		if (m.isEmpty) continue
		if (m.value > observedMax) observedMax = m.value
	}
	const headroomMax = observedMax * 1.1
	const targetFloor = 2 * TARGET_RS
	return Math.max(targetFloor, headroomMax)
}

function buildAxes(
	rows: ReadonlyArray<PerSubTypePerformance>,
	section: SectionId
): ReadonlyArray<AxisDatum> {
	const rowsBySubTypeId: ReadonlyMap<SubTypeId, PerSubTypePerformance> = new Map(
		rows.map(function entry(r) {
			return [r.subTypeId, r]
		})
	)
	const canonical = subTypes.filter(function bySection(t) {
		return t.section === section
	})
	interface Raw {
		subTypeId: SubTypeId
		displayName: string
		value: number
		isEmpty: boolean
	}
	const raw: Raw[] = canonical.map(function compose(t) {
		const m = metricFor(rowsBySubTypeId.get(t.id))
		return {
			subTypeId: t.id,
			displayName: t.displayName,
			value: m.value,
			isEmpty: m.isEmpty
		}
	})
	raw.sort(function byDisplayName(a, b) {
		return a.displayName.localeCompare(b.displayName)
	})
	const n = raw.length
	if (n === 0) return []
	const startAngle = -Math.PI / 2
	const angleStep = (Math.PI * 2) / n
	return raw.map(function withAngle(r, i) {
		return {
			subTypeId: r.subTypeId,
			displayName: r.displayName,
			value: r.value,
			isEmpty: r.isEmpty,
			angle: startAngle + i * angleStep
		}
	})
}

interface PointXY {
	x: number
	y: number
}

function pointAt(angleRad: number, distance: number): PointXY {
	return {
		x: CENTER + Math.cos(angleRad) * distance,
		y: CENTER + Math.sin(angleRad) * distance
	}
}

function polygonPath(points: ReadonlyArray<PointXY>): string {
	if (points.length === 0) return ""
	const cmds = points
		.map(function fmt(p, i) {
			const cmd = i === 0 ? "M" : "L"
			return `${cmd}${p.x.toFixed(1)},${p.y.toFixed(1)}`
		})
		.join(" ")
	return `${cmds} Z`
}

function pickAnchor(angle: number): "start" | "middle" | "end" {
	const cx = Math.cos(angle)
	if (cx > 0.2) return "start"
	if (cx < -0.2) return "end"
	return "middle"
}

function radiusFor(value: number, outerRingValue: number): number {
	if (outerRingValue <= 0) return 0
	const ratio = value / outerRingValue
	const clamped = ratio > 1 ? 1 : ratio
	if (clamped < 0) return 0
	return clamped * RADIUS
}

interface RingProps {
	scale: number
	axes: ReadonlyArray<AxisDatum>
}

function Ring(props: RingProps) {
	const pts = props.axes.map(function ringPt(a) {
		return pointAt(a.angle, RADIUS * props.scale)
	})
	const isOuter = props.scale === 1
	const ringClass = isOuter ? "text-foreground/30" : "text-foreground/15"
	const ringWidth = isOuter ? "1" : "0.75"
	return (
		<path
			className={ringClass}
			d={polygonPath(pts)}
			fill="none"
			stroke="currentColor"
			strokeWidth={ringWidth}
		/>
	)
}

function TopicProficiencyRadar(props: TopicProficiencyRadarProps) {
	const axes = buildAxes(props.rows, props.section)
	if (axes.length === 0) {
		return <p className="text-foreground/70 text-sm">No sub-types configured for this section.</p>
	}

	const targetRadius = radiusFor(TARGET_RS, props.outerRingValue)
	const targetPoints = axes.map(function targetPt(axis) {
		return pointAt(axis.angle, targetRadius)
	})
	const targetPath = polygonPath(targetPoints)

	const profilePoints = axes.map(function pointFor(axis) {
		return pointAt(axis.angle, radiusFor(axis.value, props.outerRingValue))
	})
	const profilePath = polygonPath(profilePoints)

	const ringScales = [0.25, 0.5, 0.75, 1] as const

	const sectionLabel = props.section === "verbal" ? "verbal" : "numerical"

	return (
		<div className="space-y-2">
			<svg
				aria-label={`Proficiency across ${axes.length} ${sectionLabel} sub-types; cobalt ring marks 80% accuracy at 18 seconds per question.`}
				className="h-[280px] w-full overflow-visible"
				overflow="visible"
				role="img"
				viewBox={`0 0 ${VIEW_SIZE} ${VIEW_SIZE}`}
				xmlns="http://www.w3.org/2000/svg"
			>
				{ringScales.map(function renderRing(scale) {
					return <Ring key={scale} axes={axes} scale={scale} />
				})}

				{axes.map(function renderSpoke(axis) {
					const end = pointAt(axis.angle, RADIUS)
					return (
						<line
							key={`spoke-${axis.subTypeId}`}
							className="text-foreground/15"
							stroke="currentColor"
							strokeWidth="0.75"
							x1={CENTER}
							x2={end.x}
							y1={CENTER}
							y2={end.y}
						/>
					)
				})}

				{/* Cobalt target ring — brand-target reference at 80% accuracy /
			    18s pace. Solid (structural reference, not goal-line dashed). */}
				<path
					className="text-cobalt/70"
					d={targetPath}
					fill="none"
					stroke="currentColor"
					strokeLinejoin="round"
					strokeWidth="1.25"
				/>

				<path
					className="text-cobalt"
					d={profilePath}
					fill="currentColor"
					fillOpacity={0.14}
					stroke="currentColor"
					strokeLinejoin="round"
					strokeWidth="1.5"
				/>

				{axes.map(function renderVertex(axis) {
					const p = pointAt(axis.angle, radiusFor(axis.value, props.outerRingValue))
					const vertexClass = axis.isEmpty ? "text-foreground/40" : "text-cobalt"
					const titleSuffix = axis.isEmpty
						? "no attempts this session"
						: `RS ${axis.value.toFixed(1)}`
					return (
						<circle
							key={`v-${axis.subTypeId}`}
							className={vertexClass}
							cx={p.x}
							cy={p.y}
							fill="currentColor"
							r={2.5}
						>
							<title>{`${axis.displayName}: ${titleSuffix}`}</title>
						</circle>
					)
				})}

				{axes.map(function renderLabel(axis) {
					const p = pointAt(axis.angle, LABEL_RADIUS)
					const anchor = pickAnchor(axis.angle)
					const labelClass = axis.isEmpty ? "text-foreground/40" : "text-foreground/80"
					return (
						<text
							key={`label-${axis.subTypeId}`}
							className={cn("fill-current font-sans text-[10px]", labelClass)}
							dominantBaseline="middle"
							textAnchor={anchor}
							x={p.x}
							y={p.y}
						>
							{axis.displayName}
						</text>
					)
				})}
			</svg>
			<p className="text-[11px] text-text-3 leading-snug">
				<span className="font-medium text-text-2">Radar Score</span>
				{" = (Accuracy"}
				<sup className="text-[9px]">2</sup>
				{" × T"}
				<sub className="text-[9px]">target</sub>
				{" / T"}
				<sub className="text-[9px]">actual</sub>
				{") × 100"}
			</p>
		</div>
	)
}

export type { SectionId, TopicProficiencyRadarProps }
export {
	computeOuterRingValue,
	TARGET_ACCURACY,
	TARGET_PACE_SECONDS,
	TARGET_RS,
	TopicProficiencyRadar
}
