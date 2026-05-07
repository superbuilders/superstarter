import type { Metadata } from "next"
import { Newsreader, Plus_Jakarta_Sans } from "next/font/google"
import type * as React from "react"
import "@/styles/unstyled/index.css"
import { cn } from "@/lib/utils"

const sans = Plus_Jakarta_Sans({
	subsets: ["latin"],
	display: "swap",
	variable: "--font-sans-loaded"
})

const serif = Newsreader({
	subsets: ["latin"],
	display: "swap",
	style: ["normal", "italic"],
	variable: "--font-serif-loaded"
})

const metadata: Metadata = {
	title: "18seconds",
	description: "CCAT mastery training",
	icons: [{ rel: "icon", url: "/favicon.svg", type: "image/svg+xml" }]
}

function RootLayout({ children }: { readonly children: React.ReactNode }) {
	return (
		<html lang="en" className={cn(sans.variable, serif.variable)}>
			<body>{children}</body>
		</html>
	)
}

export { metadata }
export default RootLayout
