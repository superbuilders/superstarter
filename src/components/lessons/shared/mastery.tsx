"use client"

// Mastery primitives for lessons. A lesson "is mastered" when the
// user has cleared a per-lesson threshold (default: 5). The first
// time the threshold is crossed, we fire a canvas-confetti "Realistic
// Look" burst from the score pill's on-screen position (same preset
// as <PracticeScoreConfetti>). After the burst the pill swaps to a
// green "Mastered" state with a check emoji.
//
// Local-only: there is no persistence. Refreshing the page resets
// progress. Lessons are practice surfaces, not graded artifacts.

import * as errors from "@superbuilders/errors"
import confetti from "canvas-confetti"
import * as React from "react"
import { markMastered } from "@/components/lessons/shared/lesson-mastery-store"
import { logger } from "@/logger"

const PARTICLE_COUNT = 200
const DEFAULT_MASTERY_THRESHOLD = 5

interface BurstSpec {
	particleRatio: number
	options: confetti.Options
}

const BURSTS: ReadonlyArray<BurstSpec> = [
	{ particleRatio: 0.25, options: { spread: 26, startVelocity: 55 } },
	{ particleRatio: 0.2, options: { spread: 60 } },
	{ particleRatio: 0.35, options: { spread: 100, decay: 0.91, scalar: 0.8 } },
	{ particleRatio: 0.1, options: { spread: 120, startVelocity: 25, decay: 0.92, scalar: 1.2 } },
	{ particleRatio: 0.1, options: { spread: 120, startVelocity: 45 } }
]

function fireRealisticBurst(originX: number, originY: number): void {
	for (const burst of BURSTS) {
		const fireResult = errors.trySync(function emit() {
			confetti({
				...burst.options,
				origin: { x: originX, y: originY },
				particleCount: Math.floor(PARTICLE_COUNT * burst.particleRatio)
			})
		})
		if (fireResult.error) {
			logger.warn(
				{ error: fireResult.error, originX, originY },
				"lesson-mastery: confetti burst failed"
			)
		}
	}
}

function originFromRef(el: HTMLElement | null): { x: number; y: number } {
	if (el === null) return { x: 0.5, y: 0.3 }
	const rect = el.getBoundingClientRect()
	const cx = rect.left + rect.width / 2
	const cy = rect.top + rect.height / 2
	return {
		x: cx / window.innerWidth,
		y: cy / window.innerHeight
	}
}

interface UseMasteryOptions {
	slug: string
	score: number
	threshold?: number
	originRef: React.RefObject<HTMLElement | null>
}

function useMastery({
	slug,
	score,
	threshold = DEFAULT_MASTERY_THRESHOLD,
	originRef
}: UseMasteryOptions): boolean {
	const [mastered, setMastered] = React.useState(false)

	React.useEffect(
		function maybeFire() {
			if (mastered) return
			if (score < threshold) return
			if (typeof window === "undefined") return
			const origin = originFromRef(originRef.current)
			fireRealisticBurst(origin.x, origin.y)
			markMastered(slug)
			setMastered(true)
		},
		[score, threshold, originRef, mastered, slug]
	)

	return mastered
}

interface MasteryPillProps {
	label: string
	value: string
	tone: string
	mastered: boolean
	pillRef: React.RefObject<HTMLDivElement | null>
}
function MasteryPill({ label, value, tone, mastered, pillRef }: MasteryPillProps) {
	if (mastered) {
		return (
			<div
				ref={pillRef}
				className="rounded-md border border-good bg-good/10 px-3 py-1.5 text-right transition-colors"
			>
				<p className="font-semibold text-[9px] text-good uppercase tracking-[0.08em]">Mastered</p>
				<p className="flex items-center justify-end gap-1 font-mono font-semibold text-[14px] text-good tabular-nums">
					<span aria-hidden="true">✅</span>
					<span>{value}</span>
				</p>
			</div>
		)
	}
	return (
		<div
			ref={pillRef}
			className="rounded-md border border-border-soft bg-bg px-3 py-1.5 text-right"
		>
			<p className="font-semibold text-[9px] text-text-3 uppercase tracking-[0.08em]">{label}</p>
			<p className={`font-mono font-semibold text-[14px] tabular-nums ${tone}`}>{value}</p>
		</div>
	)
}

export type { MasteryPillProps, UseMasteryOptions }
export { DEFAULT_MASTERY_THRESHOLD, MasteryPill, useMastery }
