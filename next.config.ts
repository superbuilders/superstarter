import type { NextConfig } from "next"
import "@/env"

const config = {
	reactStrictMode: true,
	typedRoutes: true,
	images: {
		remotePatterns: [
			{
				protocol: "https",
				hostname: "images.unsplash.com"
			}
		]
	}
} satisfies NextConfig

export default config
