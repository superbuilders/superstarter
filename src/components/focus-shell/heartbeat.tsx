"use client"

// <Heartbeat> — fires `navigator.sendBeacon` at the heartbeat URL every
// 30 seconds plus once on `pagehide`. Plan §5.4 / §1.8.
//
// Uses recursive `setTimeout`, NOT `setInterval`, because (a) the codebase
// avoids setInterval generally and (b) recursive setTimeout cleans up
// cleanly when the component unmounts (the pending timeout is just
// canceled, no in-flight beacon to worry about).
//
// The route handler at /api/sessions/[sessionId]/heartbeat lands in
// commit 3. Until then this component still posts beacons to the URL
// — there's no handler, so they 404, but the browser doesn't surface
// that and the visual smoke for commit 2 just observes the DevTools
// Network tab to confirm the beacons fire.

import * as React from "react"

const HEARTBEAT_INTERVAL_MS = 30_000

interface HeartbeatProps {
	sessionId: string
	href?: string
}

function urlFor(sessionId: string, href?: string): string {
	if (href !== undefined) return href
	return `/api/sessions/${sessionId}/heartbeat`
}

function fireBeacon(sessionId: string, href?: string): void {
	if (typeof navigator === "undefined") return
	const url = urlFor(sessionId, href)
	// sendBeacon body is unused — sessionId is in the path. An empty Blob
	// is fine; the browser still issues the POST.
	const blob = new Blob([""], { type: "text/plain" })
	navigator.sendBeacon(url, blob)
}

function Heartbeat(props: HeartbeatProps) {
	const sessionId = props.sessionId
	const href = props.href
	React.useEffect(
		function attachHeartbeat() {
			let timeoutId: ReturnType<typeof setTimeout> | undefined
			const controller = new AbortController()

			function schedule() {
				timeoutId = setTimeout(function scheduledBeacon() {
					fireBeacon(sessionId, href)
					schedule()
				}, HEARTBEAT_INTERVAL_MS)
			}

			schedule()
			window.addEventListener(
				"pagehide",
				function pageHideListener() {
					fireBeacon(sessionId, href)
				},
				{ signal: controller.signal }
			)

			return function cleanup() {
				if (timeoutId !== undefined) {
					clearTimeout(timeoutId)
				}
				controller.abort()
			}
		},
		[sessionId, href]
	)
	return null
}

export type { HeartbeatProps }
export { Heartbeat, HEARTBEAT_INTERVAL_MS }
