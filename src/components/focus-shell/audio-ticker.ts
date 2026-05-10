"use client"

// audio-ticker — urgency audio for the focus shell.
//
// Single rule (SPEC §6.12, post-Round-1 commit 9 amendment): at session
// start, pick one MP3 file at random from the bank manifest at
// src/config/sound-bank.ts. When the per-question target elapses, the
// chosen file plays ONCE as a one-shot warning accent. Synth ticks (via
// playTick) take over for the post-target window — those are scheduled
// by the focus-shell, not by this module. Stop on advance: the active
// warning source is cancelled if it's still mid-playback. Same file
// plays for every question in the same session; a hard refresh re-picks.
//
// Pre-amendment behavior: the warning buffer played on a continuous loop
// (`source.loop = true`) until item advance, with no post-target synth
// ticks. The Round 1 §5.9 redline retired the loop in favor of warning-
// once + post-target ticks; SPEC §6.12 + this header reflect the new
// design. The exported function names (`startUrgencyLoop`,
// `stopUrgencyLoop`) are intentionally NOT renamed to avoid cascading
// the rename into the reducer-side `urgencyLoopStartedForCurrentQuestion`
// flag + `urgency_loop_started` action; the names now read as slight
// misnomers but every concrete behavior they describe is the warning-
// once-then-cancel-on-advance contract.
//
// Browser autoplay policy gates AudioContext creation behind a user
// interaction. `unlockAudio()` must be called from a click / pointerdown
// / keydown handler. Calls to startUrgencyLoop / stopUrgencyLoop before
// the context is unlocked OR before the buffer has decoded are silent
// no-ops — silent failure is the correct behavior per SPEC §6.12.
//
// Each lifecycle event dispatches a window CustomEvent for harness
// instrumentation (`urgency-loop-start`, `urgency-loop-stop`). Pure no-op
// in production when nothing listens.
//
// Module-state lifetime: AudioContext, buffer, and chosen URL persist
// for the lifetime of the page. A hard refresh re-runs `pickSessionSound`
// and re-picks. There is no per-page-navigation re-pick because focus
// shell mounts only on dedicated drill / diagnostic / etc. routes — a
// soft navigation between sessions is not a supported flow today.

import * as errors from "@superbuilders/errors"
import { WARNING_SOUND_URLS } from "@/config/sound-bank"
import { logger } from "@/logger"

let audioCtx: AudioContext | undefined
let sessionAudioBuffer: AudioBuffer | undefined
let sessionAudioBufferUrl: string | undefined
let activeSourceNode: AudioBufferSourceNode | undefined

const PEAK_GAIN = 0.8

function pickSessionSound(): string | undefined {
	if (WARNING_SOUND_URLS.length === 0) {
		logger.warn({}, "audio-ticker: WARNING_SOUND_URLS is empty; urgency loop will be silent")
		return undefined
	}
	const idx = Math.floor(Math.random() * WARNING_SOUND_URLS.length)
	const url = WARNING_SOUND_URLS[idx]
	if (url === undefined) {
		logger.error(
			{ idx, length: WARNING_SOUND_URLS.length },
			"audio-ticker: pickSessionSound index out of range"
		)
		return undefined
	}
	return url
}

async function loadBuffer(ctx: AudioContext, url: string): Promise<void> {
	const fetchResult = await errors.try(fetch(url))
	if (fetchResult.error) {
		logger.warn(
			{ error: fetchResult.error, url },
			"audio-ticker: fetch failed; urgency loop will be silent"
		)
		return
	}
	const response = fetchResult.data
	if (!response.ok) {
		logger.warn(
			{ status: response.status, url },
			"audio-ticker: fetch non-2xx; urgency loop will be silent"
		)
		return
	}
	const bufferResult = await errors.try(response.arrayBuffer())
	if (bufferResult.error) {
		logger.warn(
			{ error: bufferResult.error, url },
			"audio-ticker: arrayBuffer failed; urgency loop will be silent"
		)
		return
	}
	const decodeResult = await errors.try(ctx.decodeAudioData(bufferResult.data))
	if (decodeResult.error) {
		logger.warn(
			{ error: decodeResult.error, url },
			"audio-ticker: decodeAudioData failed; urgency loop will be silent"
		)
		return
	}
	sessionAudioBuffer = decodeResult.data
	sessionAudioBufferUrl = url
	logger.debug(
		{ url, durationSec: sessionAudioBuffer.duration },
		"audio-ticker: session sound buffer ready"
	)
}

function unlockAudio(): void {
	if (typeof window === "undefined") return
	if (typeof AudioContext === "undefined") return
	if (audioCtx === undefined) {
		const result = errors.trySync(function makeCtx() {
			return new AudioContext()
		})
		if (result.error) {
			logger.warn({ error: result.error }, "audio-ticker: AudioContext creation failed")
			return
		}
		audioCtx = result.data
		const url = pickSessionSound()
		if (url === undefined) return
		// Fire-and-forget the buffer load. The startUrgencyLoop call will
		// silently no-op if the buffer hasn't finished decoding by the time
		// the per-question target fires (e.g., very fast first-question
		// triage on a slow connection); the next question will catch up.
		const ctx = audioCtx
		loadBuffer(ctx, url).catch(function noop() {
			// errors.try inside loadBuffer already logs; nothing to do here.
		})
		return
	}
	// Existing context — resume if suspended. Browser autoplay policy
	// can transition AudioContext.state to "suspended" when the tab is
	// backgrounded or the system suspends audio; subsequent user
	// interaction is the only path back to "running". Without this,
	// playTick and startUrgencyLoop early-return on `state !== "running"`
	// and the audio silently dies for the rest of the session even
	// though the user is now actively interacting.
	if (audioCtx.state === "suspended") {
		const ctx = audioCtx
		ctx.resume().catch(function noop() {
			// resume() can reject if the context is closed or the browser
			// policy is hostile. Silent failure is the contract — the
			// caller's downstream play paths will early-return on
			// state !== "running" and the rest of the UI keeps working.
		})
	}
}

function emitEvent(kind: "tick" | "urgency-loop-start" | "urgency-loop-stop", url?: string): void {
	if (typeof window === "undefined") return
	const detail = { kind, timestampMs: Date.now(), url }
	window.dispatchEvent(new CustomEvent("audio-ticker", { detail }))
}

// Pre-target synth tick — restored in commit 2.5 of the focus-shell
// post-overhaul-fixes round. Fires at integer seconds in the second
// half of perQuestionTargetMs (e.g., seconds 10-17 of an 18s target).
// The urgency-loop sample at second 18 is the new "you've hit target"
// signal, replacing the synth dong from commit 6 of the prior round
// — so these synth ticks have no companion synth dong; the handoff is
// straight from the last tick into the looped sample.
//
// Peak gain stays at 0.12 (the pre-commit-2 value). v2's reasoning
// for raising it ("the loop replaces the tick") no longer applies in
// the v2.5 hybrid model.
function playTick(): void {
	if (audioCtx === undefined) return
	if (audioCtx.state !== "running") return
	const ctx = audioCtx
	const result = errors.trySync(function play() {
		const now = ctx.currentTime
		const osc = ctx.createOscillator()
		const gain = ctx.createGain()
		osc.type = "sine"
		osc.frequency.value = 880
		gain.gain.setValueAtTime(0, now)
		gain.gain.linearRampToValueAtTime(0.12, now + 0.005)
		gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05)
		osc.connect(gain).connect(ctx.destination)
		osc.start(now)
		osc.stop(now + 0.06)
	})
	if (result.error) return
	emitEvent("tick")
}

function startUrgencyLoop(): void {
	if (audioCtx === undefined) return
	if (audioCtx.state !== "running") return
	if (sessionAudioBuffer === undefined) {
		logger.debug({}, "audio-ticker: startUrgencyLoop called before buffer ready; no-op")
		return
	}
	if (activeSourceNode !== undefined) {
		// Defensive: a previous loop is still active. Stop it first to
		// avoid stacking sources on top of each other.
		const prev = activeSourceNode
		const stopResult = errors.trySync(function stopPrev() {
			prev.stop()
		})
		if (stopResult.error) {
			logger.warn(
				{ error: stopResult.error },
				"audio-ticker: failed to stop previous source before starting new one"
			)
		}
		activeSourceNode = undefined
	}
	const ctx = audioCtx
	const buf = sessionAudioBuffer
	const result = errors.trySync(function play() {
		const source = ctx.createBufferSource()
		const gain = ctx.createGain()
		source.buffer = buf
		// One-shot per Round 1 §5.9 / SPEC §6.12 amendment — the prior
		// `source.loop = true` was retired in favor of warning-once +
		// post-target synth ticks (scheduled by the focus-shell).
		gain.gain.setValueAtTime(PEAK_GAIN, ctx.currentTime)
		source.connect(gain).connect(ctx.destination)
		source.start(0)
		activeSourceNode = source
	})
	if (result.error) {
		logger.warn({ error: result.error }, "audio-ticker: startUrgencyLoop play failed")
		return
	}
	emitEvent("urgency-loop-start", sessionAudioBufferUrl)
}

function stopUrgencyLoop(): void {
	if (activeSourceNode === undefined) return
	const node = activeSourceNode
	activeSourceNode = undefined
	const result = errors.trySync(function stop() {
		node.stop()
	})
	if (result.error) {
		logger.warn({ error: result.error }, "audio-ticker: stopUrgencyLoop failed")
		return
	}
	emitEvent("urgency-loop-stop")
}

export { pickSessionSound, playTick, startUrgencyLoop, stopUrgencyLoop, unlockAudio }
