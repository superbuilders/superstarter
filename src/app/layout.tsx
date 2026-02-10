import type { Metadata } from "next"
import { Geist } from "next/font/google"
import type * as React from "react"
import "@/app/globals.css"

const metadata: Metadata = {
	title: "Superstarter",
	description: "Superstarter template",
	icons: [{ rel: "icon", url: "/favicon.svg", type: "image/svg+xml" }]
}

const geist = Geist({
	subsets: ["latin"],
	variable: "--font-geist-sans"
})

function RootLayout({ children }: { readonly children: React.ReactNode }) {
	return (
		<html lang="en" className={`${geist.variable}`}>
			<body>{children}</body>
		</html>
	)
}

export { metadata }
export default RootLayout
