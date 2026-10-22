import { Array as Arr, Option, Result, String as Str } from "effect"
import type { AnyNode, CreateRule } from "#scripts/dev/oxlint/rule.ts"

const HTTP_OTLP_EXPORTER_PACKAGES: ReadonlyArray<string> = [
	"@opentelemetry/exporter-trace-otlp-http",
	"@opentelemetry/exporter-trace-otlp-proto",
	"@opentelemetry/exporter-logs-otlp-http",
	"@opentelemetry/exporter-logs-otlp-proto",
	"@opentelemetry/exporter-metrics-otlp-http",
	"@opentelemetry/exporter-metrics-otlp-proto",
	"@opentelemetry/exporter-otlp-http",
	"@opentelemetry/exporter-otlp-proto"
]

/** What shared telemetry never imports, not even a type: it stays host-neutral. */
const HOST_PACKAGES: ReadonlyArray<string> = [
	"@vercel",
	...HTTP_OTLP_EXPORTER_PACKAGES,
	"posthog-js"
]

/** Effect's APIs that open, parent-link or annotate spans directly. Outside the shared telemetry, a span is an
 * `OPERATIONAL_SPANS` entry opened by `observed` and annotated by `annotateOperation`, which type both. */
const SPAN_WRITERS: ReadonlyArray<string> = [
	"withSpan",
	"withSpanScoped",
	"makeSpan",
	"makeSpanScoped",
	"useSpan",
	"annotateCurrentSpan",
	"annotateSpans",
	"linkSpans"
]

const CONSOLE_OUTPUT: ReadonlyArray<string> = [
	"assert",
	"debug",
	"dir",
	"dirxml",
	"error",
	"info",
	"log",
	"table",
	"trace",
	"warn"
]

/** What one file may do, decided once from where it sits. `shared` is the host-neutral shared telemetry, which
 * imports no host package and alone writes spans with Effect's own APIs. `consoleRefused` marks an operational path
 * where only the operational logger writes output: the global console is refused everywhere by oxlint's no-console
 * and tsgo's globalConsole, and this covers Effect's Console. `owns` lists the owned modules the file may import
 * with a value binding. */
type FilePolicy = Readonly<{
	shared: boolean
	consoleRefused: boolean
	owns: ReadonlyArray<string>
}>

const PRODUCT_ANALYTICS: FilePolicy = { shared: false, consoleRefused: false, owns: ["posthog-js"] }

/** Every file with a role in the telemetry, by the path it sits under. The web server's observability registration
 * registers the OpenTelemetry SDK and constructs its OTLP exporters; the browser analytics SDK starts in its own
 * module, which the layout's analytics component calls; shared telemetry holds the span registry, the tracer bridge
 * and the logger. */
const FILE_POLICIES: ReadonlyArray<Readonly<{ path: string; policy: FilePolicy }>> = [
	{
		path: "/packages/product/nextjs-app/src/server/observability/",
		policy: {
			shared: false,
			consoleRefused: true,
			owns: ["@vercel/otel", ...HTTP_OTLP_EXPORTER_PACKAGES]
		}
	},
	{
		path: "/packages/product/nextjs-app/src/instrumentation.ts",
		policy: { shared: false, consoleRefused: true, owns: [] }
	},
	{ path: "/packages/product/nextjs-app/src/lib/product-analytics.ts", policy: PRODUCT_ANALYTICS },
	{
		path: "/packages/platform/operational-telemetry/",
		policy: { shared: true, consoleRefused: false, owns: [] }
	}
]

/** Every other file: application code with no role in the telemetry. */
const APPLICATION: FilePolicy = { shared: false, consoleRefused: false, owns: [] }

const policyOf = (file: string): FilePolicy =>
	Option.match(
		Arr.findFirst(FILE_POLICIES, (row) => Str.includes(row.path)(file)),
		{ onNone: () => APPLICATION, onSome: (row) => row.policy }
	)

/** The modules only their owners may import with a value binding (a type alone registers and constructs nothing),
 * with each one's refusal. */
const OWNED_MODULES: ReadonlyArray<Readonly<{ module: string; refusal: string }>> = Arr.map(
	[
		{
			module: "@vercel/otel",
			reason: "The web registration registers the OpenTelemetry SDK, once."
		},
		...Arr.map(HTTP_OTLP_EXPORTER_PACKAGES, (module) => ({
			module,
			reason: "The web registration constructs the OTLP exporters, once."
		})),
		{
			module: "posthog-js",
			reason: "The browser analytics SDK starts in its own module and provider."
		}
	],
	({ module, reason }) => {
		const owners = Arr.filterMap(FILE_POLICIES, (row) =>
			Arr.contains(row.policy.owns, module) ? Result.succeed(row.path) : Result.failVoid
		)
		return { module, refusal: `is owned by ${Arr.join(owners, ", ")}. ${reason}` }
	}
)

/** Exports no file imports: Vercel Logs and PostHog are the only remote observability tools. */
const FORBIDDEN_EXPORTS: ReadonlyArray<Readonly<{ module: string; name: string }>> = [
	{ module: "@vercel/functions", name: "metric" },
	{ module: "@opentelemetry/sdk-trace-base", name: "BasicTracerProvider" }
]

const SPAN_WRITER_MESSAGE =
	"opens or annotates a span outside the registry. Open a span with observed(OPERATIONAL_SPANS.x, opened) and write a learned fact with annotateOperation."

/** A specifier names a module or one of its subpaths; `@vercel` names the whole scope. */
const isModule = (source: string, module: string): boolean => {
	if (source === module) {
		return true
	}
	return Str.startsWith(`${module}/`)(source)
}

/** The name an import or export specifier spells: an identifier or a string. */
const nameOf = (node: AnyNode): string | undefined => {
	if (node.type === "Identifier") {
		return node.name
	}
	return node.type === "Literal" && typeof node.value === "string" ? node.value : undefined
}

/** The name a member expression reads, dotted or as a string key, when it reads one off a plain identifier. */
const memberOf = (node: AnyNode): Readonly<{ object: string; property: string }> | undefined => {
	if (node.type !== "MemberExpression" || node.object.type !== "Identifier") {
		return undefined
	}
	if (!node.computed && node.property.type === "Identifier") {
		return { object: node.object.name, property: node.property.name }
	}
	if (node.property.type === "Literal" && typeof node.property.value === "string") {
		return { object: node.object.name, property: node.property.value }
	}
	return undefined
}

const isFunction = (node: AnyNode): boolean => {
	if (node.type === "FunctionExpression") {
		return true
	}
	return node.type === "ArrowFunctionExpression"
}

/** A whole import is type-only when it says so, or when every specifier does. */
const isTypeOnlyImport = (node: AnyNode): boolean => {
	if (node.type !== "ImportDeclaration") {
		return false
	}
	if (node.importKind === "type") {
		return true
	}
	return (
		Arr.isReadonlyArrayNonEmpty(node.specifiers) &&
		Arr.every(
			node.specifiers,
			(specifier) => specifier.type === "ImportSpecifier" && specifier.importKind === "type"
		)
	)
}

/**
 * Ownership of the operational telemetry hosts, syntax only, following import renames within a file: who may
 * register the SDK and construct exporters, who may start the browser SDK, that shared telemetry stays
 * host-neutral, that Effect's span writers stay inside shared telemetry, and that only the operational logger
 * writes output in the web observability paths. An operation that is not an `OPERATIONAL_SPANS` entry cannot be
 * built at all: its type carries a key only the span registry holds.
 */
export const telemetryOwnership: CreateRule = {
	meta: { type: "problem" },
	create: (context) => {
		const { shared, consoleRefused, owns } = policyOf(context.filename)
		const effectLocals = new Set<string>()
		const consoleLocals = new Set<string>()
		const ownedLocals = new Map<string, string>()

		const report = (node: AnyNode, message: string): void => {
			context.report({ node, message })
		}

		/** The refusal a module specifier draws here, if any. */
		const refusalOf = (source: string, typeOnly: boolean): string | undefined => {
			if (shared && Arr.some(HOST_PACKAGES, (module) => isModule(source, module))) {
				return `Shared operational telemetry cannot import ${source}. Keep Vercel and HTTP OTLP exporters at the web registration and the browser product-analytics SDK at its web owners.`
			}
			const owned = Arr.findFirst(OWNED_MODULES, (candidate) => isModule(source, candidate.module))
			if (typeOnly || Option.isNone(owned) || Arr.contains(owns, owned.value.module)) {
				return undefined
			}
			return `${source} ${owned.value.refusal}`
		}

		const checkExportName = (node: AnyNode, source: string, name: string): void => {
			if (Arr.some(FORBIDDEN_EXPORTS, (entry) => entry.module === source && entry.name === name)) {
				report(
					node,
					`${source}#${name} is forbidden. Vercel Logs and PostHog are the only remote observability tools; use the shared PostHog metrics owner.`
				)
			}
		}

		/** The locals Effect's `Effect` and `Console` namespaces are bound to. */
		const trackEffect = (source: string, imported: string, local: string): void => {
			if (source !== "effect") {
				return
			}
			if (imported === "Effect") {
				effectLocals.add(local)
			}
			if (imported === "Console") {
				consoleLocals.add(local)
			}
		}

		const bindNamed = (source: string, specifier: AnyNode, refusal: string | undefined): void => {
			if (specifier.type !== "ImportSpecifier") {
				return
			}
			const imported = nameOf(specifier.imported)
			if (imported === undefined) {
				return
			}
			checkExportName(specifier, source, imported)
			trackEffect(source, imported, specifier.local.name)
			if (refusal !== undefined && specifier.importKind !== "type") {
				ownedLocals.set(specifier.local.name, refusal)
			}
		}

		/** A refused module's value bindings stay refused where they are used: constructed or called. */
		const bind = (source: string, specifier: AnyNode, refusal: string | undefined): void => {
			if (specifier.type === "ImportSpecifier") {
				bindNamed(source, specifier, refusal)
				return
			}
			if (
				(specifier.type === "ImportDefaultSpecifier" ||
					specifier.type === "ImportNamespaceSpecifier") &&
				refusal !== undefined
			) {
				ownedLocals.set(specifier.local.name, refusal)
			}
		}

		const checkSource = (node: AnyNode, source: string, typeOnly: boolean): string | undefined => {
			const refusal = refusalOf(source, typeOnly)
			if (refusal !== undefined) {
				report(node, refusal)
			}
			return refusal
		}

		const checkMember = (node: AnyNode): void => {
			const member = memberOf(node)
			if (member === undefined) {
				return
			}
			if (
				!shared &&
				effectLocals.has(member.object) &&
				Arr.contains(SPAN_WRITERS, member.property)
			) {
				report(node, `Effect.${member.property} ${SPAN_WRITER_MESSAGE}`)
			}
			if (
				consoleRefused &&
				consoleLocals.has(member.object) &&
				Arr.contains(CONSOLE_OUTPUT, member.property)
			) {
				report(
					node,
					`Effect Console '${member.property}' is forbidden in this operational path; the shared operational logger owns output. Write through Effect.log*, which the operational logger exports.`
				)
			}
		}

		const checkNamedFn = (node: AnyNode): void => {
			if (node.type !== "CallExpression") {
				return
			}
			const [first] = node.arguments
			const member = memberOf(node.callee)
			if (
				!shared &&
				member !== undefined &&
				effectLocals.has(member.object) &&
				member.property === "fn" &&
				first !== undefined &&
				!isFunction(first)
			) {
				report(
					node,
					"Effect.fn with a name opens a span outside the registry. Use Effect.fn without a name and wrap the work with observed(OPERATIONAL_SPANS.x)."
				)
			}
		}

		const checkOwnedUse = (node: AnyNode, callee: AnyNode): void => {
			const refusal = callee.type === "Identifier" ? ownedLocals.get(callee.name) : undefined
			if (refusal !== undefined) {
				report(node, refusal)
			}
		}

		return {
			ImportDeclaration: (node) => {
				const source = node.source.value
				const refusal = checkSource(node.source, source, isTypeOnlyImport(node))
				for (const specifier of node.specifiers) {
					bind(source, specifier, refusal)
				}
			},
			ExportNamedDeclaration: (node) => {
				if (node.source === null) {
					return
				}
				const source = node.source.value
				checkSource(node.source, source, node.exportKind === "type")
				for (const specifier of node.specifiers) {
					const local = nameOf(specifier.local)
					if (local !== undefined) {
						checkExportName(specifier, source, local)
					}
				}
			},
			ExportAllDeclaration: (node) => {
				checkSource(node.source, node.source.value, node.exportKind === "type")
			},
			ImportExpression: (node) => {
				if (node.source.type === "Literal" && typeof node.source.value === "string") {
					checkSource(node.source, node.source.value, false)
				}
			},
			MemberExpression: checkMember,
			CallExpression: (node) => {
				checkNamedFn(node)
				checkOwnedUse(node, node.callee)
			},
			NewExpression: (node) => {
				checkOwnedUse(node, node.callee)
			},
			VariableDeclarator: (node) => {
				if (
					shared ||
					node.id.type !== "ObjectPattern" ||
					node.init?.type !== "Identifier" ||
					!effectLocals.has(node.init.name)
				) {
					return
				}
				for (const property of node.id.properties) {
					if (
						property.type === "Property" &&
						property.key.type === "Identifier" &&
						Arr.contains(SPAN_WRITERS, property.key.name)
					) {
						report(property, `Effect.${property.key.name} ${SPAN_WRITER_MESSAGE}`)
					}
				}
			}
		}
	}
}
