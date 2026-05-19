"use client"

// <PageNav> — client wrapper around <TopNav> that consumes a chrome
// promise from a server page. Shared by every authenticated surface
// outside the dashboard itself (lessons, stats, /review listing,
// /full-length/configure, /post-session/[sessionId]) so they all show
// the same brand-row + nav links + streak chip + avatar.
//
// "use client" because of React.use(promise). Mounts inside a
// <React.Suspense> boundary the page owns; suspends until the chrome
// data resolves, then renders the same <TopNav> the dashboard uses.

import * as React from "react"
import { TopNav } from "@/components/dashboard/top-nav"
import type { NavChrome } from "@/server/nav/chrome"

interface PageNavProps {
	chromePromise: Promise<NavChrome>
}

function PageNav({ chromePromise }: PageNavProps) {
	const chrome = React.use(chromePromise)
	return <TopNav streakDays={chrome.streakDays} initials={chrome.initials} userKey={chrome.userId} />
}

export type { PageNavProps }
export { PageNav }
