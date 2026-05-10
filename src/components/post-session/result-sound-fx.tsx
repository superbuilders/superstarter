"use client"

// <ResultSoundFx> — plays a single result-tier sound on mount when the
// post-session shell renders for a full_length / simulation session.
//
// Score-tier mapping (raw correct count out of 50):
//   - 0..29  → FAILURE_SOUND_URLS
//   - 30..39 → ALMOST_SOUND_URLS
//   - 40..50 → SUCCESS_SOUND_URLS
//
// One URL from the matched bank is picked uniformly at random; an empty
// bank logs a warning and renders silently. Playback is via
// HTMLAudioElement (NOT the focus-shell's AudioContext) — the mount
// follows a user navigation gesture, so autoplay is generally allowed,
// but a rejected play() promise is logged and ignored.
//
// `tierForScore`, `bankFor`, and `pickRandomUrl` are pure helpers
// exposed for unit testing the boundary thresholds + bank routing.

import * as errors from "@superbuilders/errors"
import * as React from "react"
import { ALMOST_SOUND_URLS, FAILURE_SOUND_URLS, SUCCESS_SOUND_URLS } from "@/config/sound-bank"
import { logger } from "@/logger"

type ResultTier = "failure" | "almost" | "success"

function tierForScore(score: number): ResultTier {
	if (score <= 29) return "failure"
	if (score <= 39) return "almost"
	return "success"
}

function bankFor(tier: ResultTier): ReadonlyArray<string> {
	if (tier === "failure") return FAILURE_SOUND_URLS
	if (tier === "almost") return ALMOST_SOUND_URLS
	return SUCCESS_SOUND_URLS
}

function pickRandomUrl(urls: ReadonlyArray<string>): string | undefined {
	if (urls.length === 0) return undefined
	const idx = Math.floor(Math.random() * urls.length)
	return urls[idx]
}

interface ResultSoundFxProps {
	score: number
}

function ResultSoundFx({ score }: ResultSoundFxProps) {
	React.useEffect(
		function playResultSound() {
			if (typeof window === "undefined") return
			const tier = tierForScore(score)
			const bank = bankFor(tier)
			const url = pickRandomUrl(bank)
			if (url === undefined) {
				logger.warn({ score, tier }, "ResultSoundFx: empty bank for tier; skipping playback")
				return
			}
			const audio = new Audio(url)
			audio.volume = 0.7
			async function attemptPlay() {
				const result = await errors.try(audio.play())
				if (result.error) {
					logger.warn(
						{ error: result.error, url, score, tier },
						"ResultSoundFx: play() rejected (likely autoplay blocked)"
					)
				}
			}
			attemptPlay()
			return function cleanup() {
				// Pause + drop src so the element can be GC'd if the user
				// navigates away mid-clip.
				audio.pause()
				audio.src = ""
			}
		},
		[score]
	)
	return null
}

export type { ResultSoundFxProps, ResultTier }
export { bankFor, pickRandomUrl, ResultSoundFx, tierForScore }
