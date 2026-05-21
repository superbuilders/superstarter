"use client"

// <ResultSoundFx> — plays a single result-tier sound on a fresh
// post-session landing for a full_length / simulation session. Refresh
// and deep-link revisits stay silent; the one-shot landing marker is
// consumed on the first eligible mount per session.

import * as errors from "@superbuilders/errors"
import * as React from "react"
import { consumeFreshPracticeTestLandingEffect } from "@/components/post-session/fresh-practice-landing"
import { useFocusPrefs } from "@/components/focus-shell/focus-prefs"
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

function soundsEnabledFromPrefs(args: {
	tickingSoundEnabled: boolean
	warningSoundEnabled: boolean
}): boolean {
	return args.tickingSoundEnabled || args.warningSoundEnabled
}

interface ResultSoundFxProps {
	sessionId: string
	score: number
}

function ResultSoundFx({ sessionId, score }: ResultSoundFxProps) {
	const { prefs } = useFocusPrefs()

	React.useEffect(
		function playResultSound() {
			if (typeof window === "undefined") return
			if (soundsEnabledFromPrefs(prefs) === false) return
			if (!consumeFreshPracticeTestLandingEffect(sessionId, "result_sound")) return
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
						{ error: result.error, url, score, sessionId, tier },
						"ResultSoundFx: play() rejected after fresh landing"
					)
				}
			}
			void attemptPlay()
			return function cleanup() {
				audio.pause()
				audio.src = ""
			}
		},
		[prefs, score, sessionId]
	)
	return null
}

export type { ResultSoundFxProps, ResultTier }
export { bankFor, pickRandomUrl, ResultSoundFx, soundsEnabledFromPrefs, tierForScore }
