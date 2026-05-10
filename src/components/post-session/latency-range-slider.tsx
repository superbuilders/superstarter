"use client"

// <LatencyRangeSlider> — dual-thumb range slider with a histogram of
// session latencies behind it.
//
// The histogram visualizes how many attempts fell into each bucket
// across the session. The two range inputs select a min/max latency
// range; bars inside the selected range render in cobalt, bars
// outside fade to the muted track color so the selection reads
// at a glance even before the user releases the slider.
//
// Two `<input type="range">` controls are stacked and made non-
// interactive on the track via `pointer-events-none`; only the
// thumb pseudo-element re-enables pointer events. This is the
// canonical browser-native dual-thumb pattern that avoids a
// JS-driven drag implementation while keeping keyboard +
// screen-reader behavior intact.

import * as React from "react"
import { cn } from "@/lib/utils"

interface LatencyRangeSliderProps {
	latenciesMs: ReadonlyArray<number>
	dataMinMs: number
	dataMaxMs: number
	value: { minMs: number; maxMs: number }
	onChange: (next: { minMs: number; maxMs: number }) => void
}

const HISTOGRAM_BIN_COUNT = 24
const STEP_MS = 100

interface HistogramBin {
	startMs: number
	endMs: number
	count: number
}

function buildBins(
	latenciesMs: ReadonlyArray<number>,
	dataMinMs: number,
	dataMaxMs: number
): ReadonlyArray<HistogramBin> {
	const range = dataMaxMs - dataMinMs
	if (range <= 0) {
		return [{ startMs: dataMinMs, endMs: dataMaxMs, count: latenciesMs.length }]
	}
	const binWidth = range / HISTOGRAM_BIN_COUNT
	const bins: HistogramBin[] = []
	for (let i = 0; i < HISTOGRAM_BIN_COUNT; i += 1) {
		const startMs = dataMinMs + i * binWidth
		const endMs = i === HISTOGRAM_BIN_COUNT - 1 ? dataMaxMs : startMs + binWidth
		bins.push({ startMs, endMs, count: 0 })
	}
	for (const latency of latenciesMs) {
		let idx = Math.floor(((latency - dataMinMs) / range) * HISTOGRAM_BIN_COUNT)
		if (idx < 0) idx = 0
		if (idx >= HISTOGRAM_BIN_COUNT) idx = HISTOGRAM_BIN_COUNT - 1
		const bin = bins[idx]
		if (bin === undefined) continue
		bin.count += 1
	}
	return bins
}

function clamp(value: number, low: number, high: number): number {
	if (value < low) return low
	if (value > high) return high
	return value
}

function formatSeconds(ms: number): string {
	const seconds = ms / 1000
	return seconds.toFixed(1)
}

function parseSecondsInput(raw: string): number | null {
	const trimmed = raw.trim()
	if (trimmed === "") return null
	const seconds = Number(trimmed)
	if (!Number.isFinite(seconds)) return null
	if (seconds < 0) return null
	return Math.round(seconds * 1000)
}

function LatencyRangeSlider(props: LatencyRangeSliderProps) {
	const { latenciesMs, dataMinMs, dataMaxMs, value, onChange } = props

	const bins = React.useMemo(
		function memoBins() {
			return buildBins(latenciesMs, dataMinMs, dataMaxMs)
		},
		[latenciesMs, dataMinMs, dataMaxMs]
	)

	const maxBinCount = React.useMemo(
		function memoMax() {
			let max = 0
			for (const bin of bins) {
				if (bin.count > max) max = bin.count
			}
			return max
		},
		[bins]
	)

	const [minDraft, setMinDraft] = React.useState<string>(formatSeconds(value.minMs))
	const [maxDraft, setMaxDraft] = React.useState<string>(formatSeconds(value.maxMs))

	React.useEffect(
		function syncMinDraft() {
			setMinDraft(formatSeconds(value.minMs))
		},
		[value.minMs]
	)
	React.useEffect(
		function syncMaxDraft() {
			setMaxDraft(formatSeconds(value.maxMs))
		},
		[value.maxMs]
	)

	function commitMin(rawMs: number) {
		const clamped = clamp(rawMs, dataMinMs, value.maxMs)
		if (clamped === value.minMs) return
		onChange({ minMs: clamped, maxMs: value.maxMs })
	}
	function commitMax(rawMs: number) {
		const clamped = clamp(rawMs, value.minMs, dataMaxMs)
		if (clamped === value.maxMs) return
		onChange({ minMs: value.minMs, maxMs: clamped })
	}

	function onMinSliderChange(event: React.ChangeEvent<HTMLInputElement>) {
		const raw = Number(event.target.value)
		if (!Number.isFinite(raw)) return
		commitMin(raw)
	}
	function onMaxSliderChange(event: React.ChangeEvent<HTMLInputElement>) {
		const raw = Number(event.target.value)
		if (!Number.isFinite(raw)) return
		commitMax(raw)
	}

	function onMinInputBlur() {
		const parsed = parseSecondsInput(minDraft)
		if (parsed === null) {
			setMinDraft(formatSeconds(value.minMs))
			return
		}
		commitMin(parsed)
	}
	function onMaxInputBlur() {
		const parsed = parseSecondsInput(maxDraft)
		if (parsed === null) {
			setMaxDraft(formatSeconds(value.maxMs))
			return
		}
		commitMax(parsed)
	}
	function onInputKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
		if (event.key === "Enter") {
			event.currentTarget.blur()
		}
	}

	const range = dataMaxMs - dataMinMs
	const minPct = range > 0 ? ((value.minMs - dataMinMs) / range) * 100 : 0
	const maxPct = range > 0 ? ((value.maxMs - dataMinMs) / range) * 100 : 100

	return (
		<fieldset className="flex w-full flex-col gap-2 border-0 p-0">
			<legend className="float-left mr-2 text-[11px] text-text-3 uppercase tracking-[0.06em]">
				Time taken
			</legend>
			<div className="flex flex-wrap items-center gap-2 text-[12px] text-text-2">
				<label className="flex items-center gap-1.5">
					<span>Min</span>
					<input
						type="number"
						inputMode="decimal"
						min="0"
						step="0.1"
						value={minDraft}
						onChange={function handleMinInput(event) {
							setMinDraft(event.target.value)
						}}
						onBlur={onMinInputBlur}
						onKeyDown={onInputKeyDown}
						className="w-16 rounded-md border border-border-soft bg-surface px-2 py-[3px] font-mono text-[12px] text-text-1 tabular-nums focus-visible:outline focus-visible:outline-2 focus-visible:outline-cobalt focus-visible:outline-offset-1"
					/>
					<span>s</span>
				</label>
				<label className="flex items-center gap-1.5">
					<span>Max</span>
					<input
						type="number"
						inputMode="decimal"
						min="0"
						step="0.1"
						value={maxDraft}
						onChange={function handleMaxInput(event) {
							setMaxDraft(event.target.value)
						}}
						onBlur={onMaxInputBlur}
						onKeyDown={onInputKeyDown}
						className="w-16 rounded-md border border-border-soft bg-surface px-2 py-[3px] font-mono text-[12px] text-text-1 tabular-nums focus-visible:outline focus-visible:outline-2 focus-visible:outline-cobalt focus-visible:outline-offset-1"
					/>
					<span>s</span>
				</label>
			</div>

			<div className="relative h-16 w-full">
				{/* Histogram — full-width SVG with viewBox=0 0 100 100; bars
				    inside the active range render in cobalt, others in the
				    muted track color. */}
				<svg
					aria-hidden="true"
					className="absolute inset-x-0 top-0 h-10 w-full"
					preserveAspectRatio="none"
					viewBox="0 0 100 100"
				>
					{bins.map(function renderBin(bin, i) {
						const startPct = range > 0 ? ((bin.startMs - dataMinMs) / range) * 100 : 0
						const endPct = range > 0 ? ((bin.endMs - dataMinMs) / range) * 100 : 100
						const widthPct = endPct - startPct
						const heightPct = maxBinCount > 0 ? (bin.count / maxBinCount) * 95 : 0
						const yPct = 100 - heightPct
						const inRange = bin.endMs >= value.minMs && bin.startMs <= value.maxMs
						const fillClass = inRange ? "fill-cobalt" : "fill-border-strong"
						return (
							<rect
								key={i}
								x={startPct + widthPct * 0.05}
								y={yPct}
								width={widthPct * 0.9}
								height={heightPct}
								className={fillClass}
								rx="0.4"
							/>
						)
					})}
				</svg>

				{/* Slider track + active range, drawn in SVG so positioning is
				    pure attributes (no inline-style). */}
				<svg
					aria-hidden="true"
					className="absolute inset-x-0 bottom-[10px] h-[6px] w-full"
					preserveAspectRatio="none"
					viewBox="0 0 100 6"
				>
					<rect x="0" y="2" width="100" height="2" className="fill-border-soft" rx="1" />
					<rect
						x={minPct}
						y="2"
						width={Math.max(0, maxPct - minPct)}
						height="2"
						className="fill-cobalt"
						rx="1"
					/>
				</svg>

				{/* Two range inputs stacked. Track is non-interactive
				    (pointer-events: none on the input wrapper); only the
				    thumb pseudo-element re-enables pointer events so both
				    thumbs stay independently draggable. */}
				<input
					aria-label="Minimum time taken (seconds)"
					type="range"
					min={dataMinMs}
					max={dataMaxMs}
					step={STEP_MS}
					value={value.minMs}
					onChange={onMinSliderChange}
					className={cn(
						"pointer-events-none absolute inset-x-0 bottom-0 h-6 w-full appearance-none bg-transparent",
						"focus-visible:outline-none",
						"[&::-webkit-slider-runnable-track]:bg-transparent",
						"[&::-webkit-slider-thumb]:pointer-events-auto",
						"[&::-webkit-slider-thumb]:appearance-none",
						"[&::-webkit-slider-thumb]:relative",
						"[&::-webkit-slider-thumb]:z-10",
						"[&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:w-4",
						"[&::-webkit-slider-thumb]:rounded-full",
						"[&::-webkit-slider-thumb]:bg-cobalt",
						"[&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-white",
						"[&::-webkit-slider-thumb]:shadow-sm",
						"[&::-moz-range-track]:bg-transparent",
						"[&::-moz-range-thumb]:pointer-events-auto",
						"[&::-moz-range-thumb]:h-4 [&::-moz-range-thumb]:w-4",
						"[&::-moz-range-thumb]:rounded-full",
						"[&::-moz-range-thumb]:border-2 [&::-moz-range-thumb]:border-white",
						"[&::-moz-range-thumb]:bg-cobalt"
					)}
				/>
				<input
					aria-label="Maximum time taken (seconds)"
					type="range"
					min={dataMinMs}
					max={dataMaxMs}
					step={STEP_MS}
					value={value.maxMs}
					onChange={onMaxSliderChange}
					className={cn(
						"pointer-events-none absolute inset-x-0 bottom-0 h-6 w-full appearance-none bg-transparent",
						"focus-visible:outline-none",
						"[&::-webkit-slider-runnable-track]:bg-transparent",
						"[&::-webkit-slider-thumb]:pointer-events-auto",
						"[&::-webkit-slider-thumb]:appearance-none",
						"[&::-webkit-slider-thumb]:relative",
						"[&::-webkit-slider-thumb]:z-10",
						"[&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:w-4",
						"[&::-webkit-slider-thumb]:rounded-full",
						"[&::-webkit-slider-thumb]:bg-cobalt",
						"[&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-white",
						"[&::-webkit-slider-thumb]:shadow-sm",
						"[&::-moz-range-track]:bg-transparent",
						"[&::-moz-range-thumb]:pointer-events-auto",
						"[&::-moz-range-thumb]:h-4 [&::-moz-range-thumb]:w-4",
						"[&::-moz-range-thumb]:rounded-full",
						"[&::-moz-range-thumb]:border-2 [&::-moz-range-thumb]:border-white",
						"[&::-moz-range-thumb]:bg-cobalt"
					)}
				/>
			</div>
		</fieldset>
	)
}

export type { LatencyRangeSliderProps }
export { LatencyRangeSlider }
