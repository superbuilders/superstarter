import { POSTHOG_INGESTION_ORIGIN } from "@superstarter/operational-telemetry/destination"
import {
	Array as Arr,
	Function as Fn,
	Option,
	Predicate,
	Result,
	String as Str,
	Struct
} from "effect"
import { posthog } from "posthog-js"

/** Toolbar and in-product links only; never ingestion. */
const POSTHOG_UI_HOST = "https://us.posthog.com"

/** The browser's OTel-style resource name for PostHog Logs and Metrics; the server is
 * `superstarter-web`. */
const BROWSER_SERVICE = { serviceName: "superstarter-browser" }

/** Replay network timing keeps each entry's timing and a URL without query or hash; headers and
 * bodies never leave the browser, even if the project's remote replay settings enable them.
 * Server-action bodies carry what a user typed. */
const withoutQuery = (url: string): string => {
	const path = Option.getOrElse(Arr.head(Str.split(url, "?")), () => url)
	return Option.getOrElse(Arr.head(Str.split(path, "#")), () => path)
}

/** Product analytics, error tracking, Web Vitals, heatmaps, dead clicks, console logs, browser
 * request-duration metrics and session replay. `defaults` adopts the SDK's dated defaults.
 * `tracing_headers` adds the replay session header to same-origin requests, server actions
 * included, so server spans carry the session that recorded them. Person profiles exist only
 * after identify(). The token arrives from the server layout; the browser never reads env.
 * @see https://posthog.com/docs/libraries/js/config
 * @see https://posthog.com/docs/error-tracking/installation/nextjs */
export const startProductAnalytics = (token: string): void => {
	if (posthog.__loaded) {
		return
	}
	posthog.init(token, {
		defaults: "2026-08-30",
		api_host: POSTHOG_INGESTION_ORIGIN,
		ui_host: POSTHOG_UI_HOST,
		person_profiles: "identified_only",
		capture_pageview: "history_change",
		capture_pageleave: true,
		tracing_headers: [window.location.hostname],
		capture_exceptions: {
			capture_unhandled_errors: true,
			capture_unhandled_rejections: true,
			capture_console_errors: true
		},
		capture_performance: { web_vitals: true, network_timing: true },
		capture_heatmaps: true,
		capture_dead_clicks: true,
		logs: { ...BROWSER_SERVICE, captureConsoleLogs: true },
		metrics: { ...BROWSER_SERVICE, network: true },
		autocapture: {
			css_selector_ignorelist: [
				".ph-no-autocapture",
				"[data-ph-no-autocapture]",
				"[data-posthog-mask]",
				"[data-posthog-block]"
			]
		},
		enable_recording_console_log: true,
		session_recording: {
			maskAllInputs: true,
			slimDOMOptions: { script: true },
			blockSelector: "[data-posthog-block], input[type=hidden], input[type=file], iframe",
			maskTextSelector: "[data-posthog-mask], [data-posthog-mask] *",
			recordHeaders: false,
			recordBody: false,
			maskCapturedNetworkRequestFn: (request) => ({
				...Struct.omit(request, ["requestHeaders", "responseHeaders"]),
				name: withoutQuery(request.name),
				requestBody: null,
				responseBody: null
			}),
			recordCrossOriginIframes: false,
			captureCanvas: { recordCanvas: false },
			captureJsonLd: false
		},
		disable_capture_url_hashes: true
	})
}

/** The digest Next attaches to a Server Component or server-action error, which joins it to the
 * server's `$exception` and log for the same failure. */
const digestOf = (error: unknown): string | null =>
	Predicate.hasProperty(error, "digest") && typeof error.digest === "string" ? error.digest : null

type ExceptionProperties = Readonly<Record<string, string | number | boolean | null>>

const captureException = (error: unknown, properties: ExceptionProperties): void => {
	if (!posthog.__loaded) {
		return
	}
	Result.try(() => posthog.captureException(error, { ...properties, digest: digestOf(error) }))
}

/** Error tracking for a handled or caught failure. Handled React boundary errors do not reliably
 * reach window error autocapture; the digest is carried beside the SDK's own stack. */
export const captureProductException: {
	(properties: ExceptionProperties): (error: unknown) => void
	(error: unknown, properties: ExceptionProperties): void
} = Fn.dual(2, captureException)
