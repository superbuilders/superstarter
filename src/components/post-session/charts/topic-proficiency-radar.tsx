"use client"

// <TopicProficiencyRadar> — spider chart of per-sub-type proficiency.
//
// Each axis is a sub-type touched in the session. The axis value is a
// weighted score of accuracy × speed, both in [0,1]:
//   accuracy = correct / total
//   speed    = min(1, threshold / median)
//   score    = accuracy * speed
//
// Concentric reference rings sit at 0.25 / 0.5 / 0.75 / 1.0 so the
// polygon's distance from the center reads at a glance. The filled
// polygon is the user's profile; vertices that pull toward the center
// are the weakest sub-types.
//
// Requires ≥3 sub-types to form a polygon; below that, we surface a
// compact fallback message.

import type { PerSubTypePerformance } from "@/app/(diagnostic-flow)/post-session/[sessionId]/page"
import { SUB_TYPE_BY_ID } from "@/components/post-session/_lib/sub-type-display"
import type { SubTypeId } from "@/config/sub-types"

interface TopicProficiencyRadarProps {
	rows: ReadonlyArray<PerSubTypePerformance>
}

interface AxisDatum {
	subTypeId: SubTypeId
	displayName: string
	score: number
	angle: number
}

const VIEW_SIZE = 280
const CENTER = VIEW_SIZE / 2
const RADIUS = 96
const LABEL_RADIUS = RADIUS + 22

function clamp01(n: number): number {
	if (n < 0) return 0
	if (n > 1) return 1
	return n
}

function buildAxes(rows: ReadonlyArray<PerSubTypePerformance>): ReadonlyArray<AxisDatum> {
	interface Raw {
		subTypeId: SubTypeId
		displayName: string
		score: number
	}
	const raw: Raw[] = []
	for (const r of rows) {
		const meta = SUB_TYPE_BY_ID.get(r.subTypeId)
		if (meta === undefined) continue
		if (r.total <= 0) continue
		const accuracy = r.correct / r.total
		const speed = r.medianLatencyMs > 0 ? meta.latencyThresholdMs / r.medianLatencyMs : 1
		const score = clamp01(accuracy) * clamp01(speed)
		raw.push({ subTypeId: r.subTypeId, displayName: meta.displayName, score })
	}
	raw.sort(function byName(a, b) {
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
			score: r.score,
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
	const axes = buildAxes(props.rows)

	if (axes.length < 3) {
		return (
			<p className="text-foreground/70 text-sm">
				Practice at least three sub-types in a session to see your topic profile.
			</p>
		)
	}

	const profilePoints = axes.map(function pointFor(axis) {
		return pointAt(axis.angle, axis.score * RADIUS)
	})
	const profilePath = polygonPath(profilePoints)
	const ringScales = [0.25, 0.5, 0.75, 1] as const

	return (
		<svg
			aria-label={`Proficiency by sub-type across ${axes.length} axes.`}
			className="h-[280px] w-full overflow-visible"
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
				const p = pointAt(axis.angle, axis.score * RADIUS)
				return (
					<circle
						key={`v-${axis.subTypeId}`}
						className="text-cobalt"
						cx={p.x}
						cy={p.y}
						fill="currentColor"
						r={2.5}
					>
						<title>{`${axis.displayName}: ${(axis.score * 100).toFixed(0)} / 100`}</title>
					</circle>
				)
			})}

			{axes.map(function renderLabel(axis) {
				const p = pointAt(axis.angle, LABEL_RADIUS)
				const anchor = pickAnchor(axis.angle)
				return (
					<text
						key={`label-${axis.subTypeId}`}
						className="fill-current text-[10px] text-foreground/80"
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
	)
}

export type { TopicProficiencyRadarProps }
export { TopicProficiencyRadar }
