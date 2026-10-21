"use client"

import { type ReactNode, useEffect } from "react"
import type { TelemetryBackend } from "#env.ts"
import { startProductAnalytics } from "#lib/product-analytics.ts"

/** Starts posthog-js once, in the root layout, on the PostHog backend only: the server layout
 * hands over the backend with its project token, and the browser bundle reads no env of its own.
 * The local backend starts nothing; the browser's own console and Next's overlay serve there. */
export const PosthogProvider = ({
	backend,
	children
}: Readonly<{ backend: TelemetryBackend; children: ReactNode }>) => {
	const token = backend.kind === "posthog" ? backend.token : undefined
	useEffect(() => {
		if (token !== undefined) {
			startProductAnalytics(token)
		}
	}, [token])
	return children
}
