import type { Metadata } from "next"
import { Geist, Inter } from "next/font/google"
import type * as React from "react"
import "@/app/globals.css"
import { cn } from "@/lib/utils"

const inter = Inter({ subsets: ["latin"], variable: "--font-sans" })

const metadata: Metadata = {
	title: "Todos",
	description: "A todo list app",
	icons: [{ rel: "icon", url: "/favicon.svg", type: "image/svg+xml" }]
}

const geist = Geist({
	subsets: ["latin"],
	variable: "--font-geist-sans"
})

function RootLayout({ children }: { readonly children: React.ReactNode }) {
	return (
		<html lang="en" className={cn(geist.variable, inter.variable)}>
			<body>{children}</body>
		</html>
	)
}

export { metadata }
export default RootLayout
