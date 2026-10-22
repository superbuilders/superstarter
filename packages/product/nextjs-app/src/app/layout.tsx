import "#styles/globals.css"
import { Effect } from "effect"
import { GeistSans } from "geist/font/sans"
import type { Metadata } from "next"
import type { ReactNode } from "react"
import { PosthogProvider } from "#app/posthog-provider.tsx"
import { telemetryBackend } from "#env.ts"

export const metadata: Metadata = {
	title: "Todos",
	description: "A todo list on Next.js, Effect, Drizzle and PostgreSQL",
	icons: [{ rel: "icon", url: "/favicon.svg", type: "image/svg+xml" }]
}

/** The browser never reads env: the server hands it the telemetry backend, with PostHog's public
 * project token on a Vercel deployment and nothing locally. Geist ships its font files in its
 * package, so neither `next dev` nor a build reaches a font host. */
export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
	const backend = Effect.runSync(telemetryBackend)
	return (
		<html lang="en" className={GeistSans.variable}>
			<body>
				<PosthogProvider backend={backend}>{children}</PosthogProvider>
			</body>
		</html>
	)
}
