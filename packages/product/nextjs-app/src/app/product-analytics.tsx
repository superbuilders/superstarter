"use client"

import { useEffect } from "react"
import type { PosthogProjectToken } from "#env.ts"
import { startProductAnalytics } from "#lib/product-analytics.ts"

/** Starts posthog-js once, from the root layout, on a deployment whose telemetry goes to PostHog. */
export function ProductAnalytics({ token }: Readonly<{ token: PosthogProjectToken }>) {
	useEffect(() => {
		startProductAnalytics(token)
	}, [token])
	return null
}
