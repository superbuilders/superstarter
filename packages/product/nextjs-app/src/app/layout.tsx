import "#styles/globals.css"
import { Effect } from "effect"
import { GeistSans } from "geist/font/sans"
import type { Metadata } from "next"
import type { ReactNode } from "react"
import { ProductAnalytics } from "#app/product-analytics.tsx"
import { telemetryBackend } from "#env.ts"

export const metadata: Metadata = {
	title: "Todos",
	description: "A todo list on Next.js, Effect, Drizzle and PostgreSQL",
	icons: [{ rel: "icon", url: "/favicon.svg", type: "image/svg+xml" }]
}

/** The browser never reads env: on a Vercel deployment the server hands it PostHog's public project
 * token, and locally the browser starts no analytics at all (its console and Next's overlay serve
 * there). Geist ships its font files in its package, so neither `next dev` nor a build reaches a
 * font host. */
export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
	const backend = Effect.runSync(telemetryBackend)
	return (
		<html lang="en" className={GeistSans.variable}>
			<body data-slot="root-layout">
				{children}
				{backend.kind === "posthog" ? <ProductAnalytics token={backend.token} /> : null}
			</body>
		</html>
	)
}
