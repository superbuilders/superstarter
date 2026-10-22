import type { NextConfig } from "next"

/** The workspace root: Turbopack compiles the workspace packages' TypeScript from there, and output
 * tracing follows their files into the deployment. */
const WORKSPACE_ROOT = `${import.meta.dirname}/../../..`

const config = {
	reactStrictMode: true,
	poweredByHeader: false,
	typedRoutes: true,
	cacheComponents: true,
	partialPrefetching: true,
	reactCompiler: { panicThreshold: "all_errors" },
	experimental: {
		turbopackUseBuiltinBabel: true
	},
	agentRules: false,
	serverExternalPackages: ["pg"],
	outputFileTracingRoot: WORKSPACE_ROOT,
	turbopack: { root: WORKSPACE_ROOT }
} satisfies NextConfig

export default config
