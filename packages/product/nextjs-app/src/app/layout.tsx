import "#styles/globals.css"
import { Effect } from "effect"
import type { Metadata } from "next"
import { Geist } from "next/font/google"
import type { ReactNode } from "react"
import { PosthogProvider } from "#app/posthog-provider.tsx"
import { telemetryBackend } from "#env.ts"

const geist = Geist({ subsets: ["latin"], variable: "--font-sans" })

export const metadata: Metadata = {
	title: "Todos",
	description: "A todo list on Next.js, Effect, Drizzle and PostgreSQL",
	icons: [{ rel: "icon", url: "/favicon.svg", type: "image/svg+xml" }]
}

/** The browser never reads env: the server hands it the telemetry backend, with PostHog's public
 * project token on a Vercel deployment and nothing locally. */
export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
	const backend = Effect.runSync(telemetryBackend)
	return (
		<html lang="en" className={geist.variable}>
			<body>
				<PosthogProvider backend={backend}>{children}</PosthogProvider>
			</body>
		</html>
	)
}
