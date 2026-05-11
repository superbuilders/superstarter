"use client"

// <PracticeScoreConfetti> — fires a canvas-confetti "Realistic Look"
// burst from the PacingScore element's on-screen position when the
// user lands on /post-session/<id> immediately after completing a
// practice test (full_length or simulation) AND their raw correct
// count is 40 or higher (out of 50). Re-opening the page from /review
// or refreshing does NOT re-fire — the fresh-landing flag in
// sessionStorage is consumed on the first mount per session.
//
// Gating layered (all must hold to fire):
//   1. sessionType is "full_length" or "simulation"
//   2. score >= 40
//   3. consumeFreshPracticeTestLanding(sessionId) returns true
//      (set by full-length/run before router.push, cleared on read)
//
// Origin: the score element's bounding rect, converted to the
// 0..1 viewport coordinates that confetti expects.

import confetti from "canvas-confetti"
import * as errors from "@superbuilders/errors"
import * as React from "react"
import { consumeFreshPracticeTestLanding } from "@/components/post-session/fresh-practice-landing"
import { logger } from "@/logger"

const PRACTICE_CONFETTI_THRESHOLD = 40
const PARTICLE_COUNT = 200

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
				"practice-score-confetti: burst failed"
			)
		}
	}
}

interface PracticeScoreConfettiProps {
	sessionId: string
	sessionType: "diagnostic" | "drill" | "full_length" | "simulation" | "mistakes"
	score: number
	originRef: React.RefObject<HTMLElement | null>
}

function PracticeScoreConfetti(props: PracticeScoreConfettiProps) {
	const { sessionId, sessionType, score, originRef } = props

	React.useEffect(
		function maybeFireOnMount() {
			if (typeof window === "undefined") return
			if (sessionType !== "full_length" && sessionType !== "simulation") return
			if (score < PRACTICE_CONFETTI_THRESHOLD) return
			if (!consumeFreshPracticeTestLanding(sessionId)) return
			const el = originRef.current
			let originX = 0.5
			let originY = 0.3
			if (el !== null) {
				const rect = el.getBoundingClientRect()
				const cx = rect.left + rect.width / 2
				const cy = rect.top + rect.height / 2
				originX = cx / window.innerWidth
				originY = cy / window.innerHeight
			}
			fireRealisticBurst(originX, originY)
		},
		[sessionType, score, originRef, sessionId]
	)
	return null
}

export type { PracticeScoreConfettiProps }
export { PRACTICE_CONFETTI_THRESHOLD, PracticeScoreConfetti }
