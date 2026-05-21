// (app) route-group layout — auth gate.
//
// `docs/plans/onboarding-flow-removal.md` C1 removed the diagnostic-
// completion check that previously also gated this group. Post-removal,
// the remaining gate is signed-in vs signed-out: defensive belt-and-
// suspenders over src/proxy.ts, which already redirects unauthenticated
// requests to /login. Auth at the layout boundary is retained because a
// single-source proxy check is fragile — matcher carve-outs or future
// route additions can introduce gaps.
//
// This layout is a Server Component (no async per
// rules/rsc-data-fetching-patterns.md), so the auth() call is initiated
// as a promise and awaited inside a Suspense boundary. The Suspense is
// required by next.config.ts's `cacheComponents: true` — uncached awaits
// must live inside a Suspense boundary.

import { redirect } from "next/navigation"
import * as React from "react"
import { auth } from "@/auth"
import { logger } from "@/logger"

async function requireAuth(): Promise<void> {
	const session = await auth()
	if (!session?.user?.id) {
		logger.debug({}, "(app) layout: no auth session, redirect /login")
		redirect("/login")
	}
}

function AppLayout(props: { children: React.ReactNode }) {
	const gatePromise = requireAuth()
	return (
		<React.Suspense fallback={null}>
			<AppLayoutInner gatePromise={gatePromise}>{props.children}</AppLayoutInner>
		</React.Suspense>
	)
}

// Inner component is `async` only to await the gate promise. This keeps
// the outer `AppLayout` synchronous (matches the rsc-data-fetching-patterns
// rule that the page-level component is non-async); the inner is the
// canonical "gate then render children" shape. The Suspense above is
// required by next.config.ts's `cacheComponents: true` — uncached
// awaits must live inside a Suspense boundary.
async function AppLayoutInner(props: { gatePromise: Promise<void>; children: React.ReactNode }) {
	await props.gatePromise
	return props.children
}

export default AppLayout
