import type { NextConfig } from "next"

/** The workspace root: Turbopack compiles the workspace packages' TypeScript from there, and output
 * tracing follows their files into the deployment. */
const WORKSPACE_ROOT = `${import.meta.dirname}/../../..`

const config = {
	reactStrictMode: true,
	poweredByHeader: false,
	typedRoutes: true,
	cacheComponents: true,
	// Prefetches carry a route's static shell only, never its dynamic data: the next major's default.
	partialPrefetching: true,
	// The React Compiler memoizes components, so manual useMemo and useCallback never appear. A
	// component it cannot compile fails the build instead of shipping unmemoized.
	reactCompiler: { panicThreshold: "all_errors" },
	experimental: {
		turbopackUseBuiltinBabel: true
	},
	// Next 16.3+ writes managed blocks into AGENTS.md and CLAUDE.md unless this is off.
	agentRules: false,
	serverExternalPackages: ["pg"],
	outputFileTracingRoot: WORKSPACE_ROOT,
	turbopack: { root: WORKSPACE_ROOT }
} satisfies NextConfig

export default config
