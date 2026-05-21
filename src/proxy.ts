import { auth } from "@/auth"

const PUBLIC_PREFIXES: ReadonlyArray<string> = [
	"/api/auth",
	"/login",
	"/api/health",
	"/api/cron",
	// /api/admin/* is for scripted/curl access. Each route MUST self-guard
	// (currently with `Authorization: Bearer ${CRON_SECRET}`). Form-based admin
	// flows go through server actions under /admin/*, which do session +
	// admin-allowlist checks via requireAdminEmail() — not this prefix.
	"/api/admin",
	// /offline-app is the cohort-distribution path for the standalone offline
	// practice app (public/offline-app/index.html + public/offline-app/
	// testbank.json). It is the first content-delivery entry in this list —
	// the others are all auth machinery or operational endpoints.
	// Intentionally public: the testbank ships answers + explanations and is
	// designed for unauthenticated download by cohort members who may have no
	// 18seconds account. DO NOT place anything sensitive under this prefix.
	"/offline-app"
]

const proxy = auth(function proxyHandler(req) {
	const path = req.nextUrl.pathname
	for (const prefix of PUBLIC_PREFIXES) {
		if (path.startsWith(prefix)) {
			return undefined
		}
	}
	if (!req.auth) {
		const loginUrl = new URL("/login", req.nextUrl.origin)
		return Response.redirect(loginUrl)
	}
	return undefined
})

// `config` must be inline `export const` — Next.js statically parses it from
// the AST at build time and cannot follow re-exports.
//
// Vercel Workflows registers internal route handlers under
// /.well-known/workflow/v1/* (flow dispatch and step execution). The runtime
// self-dispatches HTTP calls to those routes from within the dev server, with
// no NextAuth session attached. They must bypass this auth proxy or runs hang
// in `pending` and never advance their steps. This carve-out applies to every
// workflow in the project, not only embedding-backfill.
//
// `api/sessions/[^/]+/heartbeat` is also excluded (Plan §7.2): the
// <Heartbeat> client component fires sendBeacon every 30 s, and routing
// it through auth() would cost a per-30s read of the auth_sessions
// table given `session: { strategy: "database" }`. The route self-guards
// by treating an unknown sessionId as a 204 no-op (no leakage of session
// existence), so dropping the auth check is safe.
export const config = {
	matcher: [
		"/((?!_next/static|_next/image|favicon|\\.well-known/workflow/|api/sessions/[^/]+/heartbeat).*)"
	]
}

export { proxy }
