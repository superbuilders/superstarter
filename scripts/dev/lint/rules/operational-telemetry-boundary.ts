import { Array as Arr, Predicate, String as Str } from "effect"
import * as ts from "typescript/unstable/ast"
import { type Symbol as NativeSymbol, type Type, TypeFlags } from "typescript/unstable/sync"
import { packageNameFromFile, packageOfSymbol } from "#scripts/dev/lint/packages.ts"
import type { LintRule, RuleContext, Violation } from "#scripts/dev/lint/types.ts"
import { violationAt } from "#scripts/dev/lint/violation.ts"
import { repositoryPath } from "#scripts/dev/shared/repository.ts"

type PathPattern =
	| Readonly<{ kind: "file"; path: string }>
	| Readonly<{ kind: "directory"; path: string }>

/** The web server's observability registration: the one place that registers the OpenTelemetry SDK and constructs
 * its OTLP exporters. */
const WEB_OBSERVABILITY: PathPattern = {
	kind: "directory",
	path: "packages/product/nextjs-app/src/server/observability/"
}

/** Shared telemetry: the span registry, the tracer bridge and the logger. Host-neutral: no Vercel package, no HTTP
 * OTLP exporter, no browser analytics SDK. */
const SHARED_TELEMETRY: PathPattern = {
	kind: "directory",
	path: "packages/platform/operational-telemetry/"
}

/** The browser analytics SDK starts in its own module and its provider component, never in shared client code. */
const PRODUCT_ANALYTICS_OWNERS: ReadonlyArray<PathPattern> = [
	{ kind: "file", path: "packages/product/nextjs-app/src/lib/product-analytics.ts" },
	{ kind: "file", path: "packages/product/nextjs-app/src/app/posthog-provider.tsx" }
]
/** The span registry: every `OperationalSpan` value is an `OPERATIONAL_SPANS` entry built here. */
const SPAN_REGISTRY_SUFFIX = "/packages/platform/operational-telemetry/src/spans.ts"

const PRODUCT_ANALYTICS_PACKAGE = "posthog-js"
const EFFECT_PACKAGE = "effect"

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

/** Operational paths where only the shared operational logger writes output. The global console is refused
 * everywhere by oxlint's no-console and tsgo's globalConsole; this covers Effect's Console. */
const CONSOLE_FORBIDDEN: ReadonlyArray<PathPattern> = [
	WEB_OBSERVABILITY,
	{ kind: "file", path: "packages/product/nextjs-app/src/instrumentation.ts" }
]

type ResolvedUsage =
	| Readonly<{ kind: "call"; node: ts.Node; symbol: NativeSymbol }>
	| Readonly<{ kind: "construct"; node: ts.Node; symbol: NativeSymbol }>
	| Readonly<{ kind: "binding"; node: ts.Node; symbol: NativeSymbol; typeOnly: boolean }>
	| Readonly<{ kind: "namespace"; node: ts.Node; symbol: NativeSymbol }>
	| Readonly<{ kind: "module"; node: ts.StringLiteral; packageName: string }>

type OwnershipPolicy =
	| Readonly<{ kind: "forbidden-symbol"; packageName: string; exportName: string }>
	| Readonly<{
			kind: "owned-symbol"
			packageName: string
			exportNames: ReadonlyArray<string>
			owners: ReadonlyArray<PathPattern>
			reach: "any-value" | "constructor-value" | "call"
			reason: string
	  }>
	| Readonly<{
			kind: "owned-module"
			packageName: string
			owners: ReadonlyArray<PathPattern>
			reason: string
	  }>

const EXPORTER_REASON = "The web registration constructs the OTLP exporters, once."

const OWNERSHIP_POLICIES: ReadonlyArray<OwnershipPolicy> = [
	{ kind: "forbidden-symbol", packageName: "@vercel/functions", exportName: "metric" },
	{
		kind: "forbidden-symbol",
		packageName: "@opentelemetry/sdk-trace-base",
		exportName: "BasicTracerProvider"
	},
	{
		kind: "owned-module",
		packageName: "@vercel/otel",
		owners: [WEB_OBSERVABILITY],
		reason: "The web registration registers the OpenTelemetry SDK, once."
	},
	{
		kind: "owned-symbol",
		packageName: "@vercel/otel",
		exportNames: ["registerOTel"],
		owners: [WEB_OBSERVABILITY],
		reach: "any-value",
		reason: "The web registration registers the OpenTelemetry SDK, once."
	},
	{
		kind: "owned-symbol",
		packageName: "@opentelemetry/exporter-trace-otlp-http",
		exportNames: ["OTLPTraceExporter"],
		owners: [WEB_OBSERVABILITY],
		reach: "constructor-value",
		reason: EXPORTER_REASON
	},
	{
		kind: "owned-symbol",
		packageName: "@opentelemetry/exporter-logs-otlp-http",
		exportNames: ["OTLPLogExporter"],
		owners: [WEB_OBSERVABILITY],
		reach: "constructor-value",
		reason: EXPORTER_REASON
	},
	{
		kind: "owned-symbol",
		packageName: "@opentelemetry/exporter-metrics-otlp-http",
		exportNames: ["OTLPMetricExporter"],
		owners: [WEB_OBSERVABILITY],
		reach: "constructor-value",
		reason: EXPORTER_REASON
	},
	{
		kind: "owned-symbol",
		packageName: EFFECT_PACKAGE,
		exportNames: SPAN_WRITERS,
		owners: [SHARED_TELEMETRY],
		reach: "call",
		reason:
			"Open a span with observed(OPERATIONAL_SPANS.x, opened) and write a learned fact with annotateOperation."
	},
	{
		kind: "owned-module",
		packageName: PRODUCT_ANALYTICS_PACKAGE,
		owners: PRODUCT_ANALYTICS_OWNERS,
		reason: "The browser analytics SDK starts in its own module and provider."
	}
]

const matchesPath = (relative: string, pattern: PathPattern): boolean => {
	if (pattern.kind === "file") {
		return relative === pattern.path
	}
	return relative === Str.slice(0, -1)(pattern.path) || Str.startsWith(pattern.path)(relative)
}

const isConsoleForbiddenPath = (relative: string): boolean =>
	Arr.some(CONSOLE_FORBIDDEN, (pattern) => matchesPath(relative, pattern))

const isOwnedExport = (
	symbol: NativeSymbol,
	packageName: string,
	exportNames: ReadonlyArray<string>
): boolean => Arr.contains(exportNames, symbol.name) && packageOfSymbol(symbol) === packageName

const reaches = (
	policy: Readonly<{ reach: "any-value" | "constructor-value" | "call" }>,
	usage: ResolvedUsage
): boolean => {
	switch (policy.reach) {
		case "any-value":
			return true
		case "call":
			return usage.kind === "call"
		case "constructor-value":
			return usage.kind === "construct" || (usage.kind === "binding" && !usage.typeOnly)
	}
}

const ownsUsage = (policy: OwnershipPolicy, usage: ResolvedUsage): boolean => {
	switch (policy.kind) {
		case "forbidden-symbol":
			return (
				usage.kind !== "module" &&
				usage.kind !== "namespace" &&
				isOwnedExport(usage.symbol, policy.packageName, [policy.exportName])
			)
		case "owned-symbol":
			return (
				usage.kind !== "module" &&
				usage.kind !== "namespace" &&
				isOwnedExport(usage.symbol, policy.packageName, policy.exportNames) &&
				reaches(policy, usage)
			)
		case "owned-module":
			return usage.kind === "module" && usage.packageName === policy.packageName
	}
}

const isTypeOnlyImportClause = (clause: ts.ImportClause | undefined): boolean =>
	clause?.phaseModifier === ts.SyntaxKind.TypeKeyword

const isTypeOnlySpecifier = (node: ts.ImportSpecifier | ts.ExportSpecifier): boolean => {
	if (node.isTypeOnly) {
		return true
	}
	if (ts.isImportSpecifier(node) && ts.isNamedImports(node.parent)) {
		const clause = node.parent.parent
		return ts.isImportClause(clause) && isTypeOnlyImportClause(clause)
	}
	if (ts.isExportSpecifier(node) && ts.isNamedExports(node.parent)) {
		const statement = node.parent.parent
		return ts.isExportDeclaration(statement) && statement.isTypeOnly
	}
	return false
}

const unwrap = (expression: ts.Expression): ts.Expression => {
	if (
		ts.isParenthesizedExpression(expression) ||
		ts.isAsExpression(expression) ||
		ts.isSatisfiesExpression(expression) ||
		ts.isTypeAssertion(expression) ||
		ts.isNonNullExpression(expression)
	) {
		return unwrap(expression.expression)
	}
	return expression
}

const calleeCandidates = (expression: ts.Expression): ReadonlyArray<ts.Expression> => {
	const inner = unwrap(expression)
	if (ts.isConditionalExpression(inner)) {
		return [...calleeCandidates(inner.whenTrue), ...calleeCandidates(inner.whenFalse)]
	}
	return [inner]
}

/** The module specifier of an import or export declaration, a dynamic import, or an import type. */
const moduleSpecifierOf = (node: ts.Node): ts.StringLiteral | undefined => {
	if (
		(ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) &&
		node.moduleSpecifier !== undefined &&
		ts.isStringLiteral(node.moduleSpecifier)
	) {
		return node.moduleSpecifier
	}
	const firstArgument = ts.isCallExpression(node) ? node.arguments[0] : undefined
	if (
		ts.isCallExpression(node) &&
		node.expression.kind === ts.SyntaxKind.ImportKeyword &&
		firstArgument !== undefined &&
		ts.isStringLiteral(firstArgument)
	) {
		return firstArgument
	}
	if (
		ts.isImportTypeNode(node) &&
		ts.isLiteralTypeNode(node.argument) &&
		ts.isStringLiteral(node.argument.literal)
	) {
		return node.argument.literal
	}
	return undefined
}

const isEffectConsoleDeclaration = (file: string): boolean => {
	const lower = Str.toLowerCase(file)
	return (
		packageNameFromFile(lower) === EFFECT_PACKAGE &&
		(Str.endsWith("/console.d.ts")(lower) ||
			Str.endsWith("/console.ts")(lower) ||
			Str.includes("/effect/dist/console")(lower) ||
			Str.includes("/effect/src/console")(lower))
	)
}

/** Effect's Console module; the global console is refused everywhere by oxlint and tsgo. */
const isEffectConsoleSymbol = (symbol: NativeSymbol): boolean => {
	const file = symbol.declarations[0]?.path
	return file !== undefined && isEffectConsoleDeclaration(file)
}

const isConsoleOutput = (symbol: NativeSymbol): boolean =>
	Arr.contains(CONSOLE_OUTPUT, symbol.name) && isEffectConsoleSymbol(symbol)

const memberNameOf = (
	node: ts.PropertyAccessExpression | ts.ElementAccessExpression
): string | undefined => {
	if (ts.isPropertyAccessExpression(node)) {
		return node.name.text
	}
	return ts.isStringLiteralLikeNode(node.argumentExpression)
		? node.argumentExpression.text
		: undefined
}

const matchesAny = (relative: string, patterns: ReadonlyArray<PathPattern>): boolean =>
	Arr.some(patterns, (pattern) => matchesPath(relative, pattern))

const describe = (patterns: ReadonlyArray<PathPattern>): string =>
	Arr.join(
		Arr.map(patterns, (pattern) => pattern.path),
		" or "
	)

/** `Effect.fn("name")`: the traced form opens a span named by its first argument, a string. */
const isStringType = (type: Type | undefined): boolean =>
	type !== undefined && (type.flags & (TypeFlags.String | TypeFlags.StringLiteral)) !== 0

/**
 * Ownership gate for the operational telemetry hosts. It resolves symbols and imports through aliases: who may
 * register the SDK and construct exporters, who may start the browser SDK, that shared telemetry stays host-neutral,
 * that spans outside it are only `OPERATIONAL_SPANS` entries opened with `observed`, and that only the operational
 * logger writes output in the web observability paths. It does not prove remote delivery.
 */
export const operationalTelemetryBoundary: LintRule = (context: RuleContext) => {
	const { sourceFile, checker, semantics } = context
	const relative = repositoryPath(sourceFile.fileName)
	const isSharedTelemetry = matchesPath(relative, SHARED_TELEMETRY)
	const consoleForbidden = isConsoleForbiddenPath(relative)
	const isSpanRegistry = Str.endsWith(SPAN_REGISTRY_SUFFIX)(Str.toLowerCase(sourceFile.fileName))
	const violations: Array<Violation> = []

	const report = (
		input: Readonly<{ node: ts.Node; message: string; suggestion: string }>
	): void => {
		violations.push(
			violationAt({
				sourceFile,
				node: input.node,
				rule: "operational-telemetry-boundary",
				message: input.message,
				suggestion: input.suggestion
			})
		)
	}

	const targetOf = (symbol: NativeSymbol | undefined): NativeSymbol | undefined =>
		symbol === undefined ? undefined : semantics.aliasTarget(symbol)

	const elementSymbolOf = (
		node: ts.ElementAccessExpression,
		name: string
	): NativeSymbol | undefined => {
		const type = semantics.typeAt(node.expression)
		return type === undefined ? undefined : targetOf(checker.getPropertyOfType(type, name))
	}

	const resolvedSymbolOf = (node: ts.Node): NativeSymbol | undefined => {
		if (ts.isShorthandPropertyAssignment(node.parent)) {
			return targetOf(checker.getShorthandAssignmentValueSymbol(node.parent))
		}
		if (ts.isElementAccessExpression(node) && ts.isStringLiteralLikeNode(node.argumentExpression)) {
			return elementSymbolOf(node, node.argumentExpression.text)
		}
		return targetOf(semantics.symbolAt(ts.isPropertyAccessExpression(node) ? node.name : node))
	}

	const checkSharedImport = (usage: ResolvedUsage): void => {
		if (!isSharedTelemetry || usage.kind === "call" || usage.kind === "construct") {
			return
		}
		const packageName = usage.kind === "module" ? usage.packageName : packageOfSymbol(usage.symbol)
		if (
			packageName === undefined ||
			!(
				Str.startsWith("@vercel/")(packageName) ||
				Arr.contains(HTTP_OTLP_EXPORTER_PACKAGES, packageName) ||
				packageName === PRODUCT_ANALYTICS_PACKAGE
			)
		) {
			return
		}
		report({
			node: usage.node,
			message: `Shared operational telemetry cannot import ${packageName}.`,
			suggestion:
				"Keep Vercel and HTTP OTLP exporters at the web registration and the browser product-analytics SDK at its web owners."
		})
	}

	const applyPolicy = (policy: OwnershipPolicy, usage: ResolvedUsage): void => {
		if (!ownsUsage(policy, usage)) {
			return
		}
		if (policy.kind === "forbidden-symbol") {
			report({
				node: usage.node,
				message: `${policy.packageName}#${policy.exportName} is forbidden.`,
				suggestion:
					"Vercel Logs and PostHog are the only remote observability tools; use the shared PostHog metrics owner."
			})
			return
		}
		if (matchesAny(relative, policy.owners)) {
			return
		}
		const subject =
			policy.kind === "owned-symbol" && usage.kind !== "module" && usage.kind !== "namespace"
				? `${policy.packageName}#${usage.symbol.name}`
				: policy.packageName
		report({
			node: usage.node,
			message: `${subject} is owned by ${describe(policy.owners)}.`,
			suggestion: policy.reason
		})
	}

	const applyOwnership = (usage: ResolvedUsage): void => {
		checkSharedImport(usage)
		for (const policy of OWNERSHIP_POLICIES) {
			applyPolicy(policy, usage)
		}
	}

	const checkConsoleMember = (node: ts.Node, symbol: NativeSymbol): void => {
		if (consoleForbidden && isConsoleOutput(symbol)) {
			report({
				node,
				message: `Effect Console '${symbol.name}' is forbidden in this operational path; the shared operational logger owns output.`,
				suggestion: "Write through Effect.log*, which the operational logger exports."
			})
		}
	}

	const checkConsoleAccess = (
		node: ts.PropertyAccessExpression | ts.ElementAccessExpression
	): void => {
		const name = memberNameOf(node)
		if (!consoleForbidden || name === undefined || !Arr.contains(CONSOLE_OUTPUT, name)) {
			return
		}
		const symbol = resolvedSymbolOf(node)
		if (symbol !== undefined) {
			checkConsoleMember(node, symbol)
		}
	}

	const inspectBinding = (name: ts.Node, typeOnly: boolean): void => {
		const symbol = resolvedSymbolOf(name)
		if (symbol !== undefined) {
			applyOwnership({ kind: "binding", node: name, symbol, typeOnly })
		}
	}

	const inspectBindings = (node: ts.Node): void => {
		if (ts.isImportSpecifier(node) || ts.isExportSpecifier(node)) {
			inspectBinding(node.name, isTypeOnlySpecifier(node))
			return
		}
		if (ts.isImportClause(node) && node.name !== undefined) {
			inspectBinding(node.name, isTypeOnlyImportClause(node))
			return
		}
		if (ts.isNamespaceImport(node)) {
			const symbol = resolvedSymbolOf(node.name)
			if (symbol !== undefined) {
				applyOwnership({ kind: "namespace", node: node.name, symbol })
			}
		}
	}

	const checkNamedFn = (
		node: ts.CallExpression,
		symbol: NativeSymbol,
		candidate: ts.Node
	): void => {
		const [first] = node.arguments
		if (
			isSharedTelemetry ||
			symbol.name !== "fn" ||
			packageOfSymbol(symbol) !== EFFECT_PACKAGE ||
			first === undefined ||
			!isStringType(semantics.typeAt(first))
		) {
			return
		}
		report({
			node: candidate,
			message: "Effect.fn with a name opens a span outside the registry.",
			suggestion:
				"Use Effect.fn without a name and wrap the work with observed(OPERATIONAL_SPANS.x)."
		})
	}

	const inspectCall = (node: ts.CallExpression): void => {
		if (node.expression.kind === ts.SyntaxKind.ImportKeyword) {
			return
		}
		for (const candidate of calleeCandidates(node.expression)) {
			const symbol = resolvedSymbolOf(candidate)
			if (symbol === undefined) {
				continue
			}
			applyOwnership({ kind: "call", node: candidate, symbol })
			checkNamedFn(node, symbol, candidate)
			if (ts.isIdentifier(candidate)) {
				checkConsoleMember(candidate, symbol)
			}
		}
	}

	/** An object literal shaped like an operation (it has a `scope`) whose contextual type is the registry's
	 * `OperationalSpan`: an entry built outside `OPERATIONAL_SPANS`. */
	const checkRegistryLiteral = (node: ts.ObjectLiteralExpression): void => {
		const hasScope = Arr.some(
			node.properties,
			(property) =>
				Predicate.or(ts.isPropertyAssignment, ts.isShorthandPropertyAssignment)(property) &&
				ts.isIdentifier(property.name) &&
				property.name.text === "scope"
		)
		if (isSpanRegistry || !hasScope) {
			return
		}
		const alias = checker.getContextualType(node)?.getAliasSymbol()
		const file = alias?.declarations[0]?.path
		if (
			alias?.name !== "OperationalSpan" ||
			file === undefined ||
			!Str.endsWith(SPAN_REGISTRY_SUFFIX)(Str.toLowerCase(file))
		) {
			return
		}
		report({
			node,
			message: "An OperationalSpan built outside the span registry.",
			suggestion: "Add the operation to OPERATIONAL_SPANS in the telemetry package's spans.ts."
		})
	}

	const inspectUses = (node: ts.Node): void => {
		if (ts.isCallExpression(node)) {
			inspectCall(node)
			return
		}
		if (ts.isNewExpression(node)) {
			const symbol = resolvedSymbolOf(unwrap(node.expression))
			if (symbol !== undefined) {
				applyOwnership({ kind: "construct", node: node.expression, symbol })
			}
			return
		}
		if (ts.isObjectLiteralExpression(node)) {
			checkRegistryLiteral(node)
			return
		}
		if (ts.isPropertyAccessExpression(node) || ts.isElementAccessExpression(node)) {
			checkConsoleAccess(node)
		}
	}

	const visit = (node: ts.Node): void => {
		const specifier = moduleSpecifierOf(node)
		const moduleSymbol =
			specifier === undefined ? undefined : checker.getSymbolAtLocation(specifier)
		const packageName =
			moduleSymbol === undefined ? undefined : packageOfSymbol(semantics.aliasTarget(moduleSymbol))
		if (specifier !== undefined && packageName !== undefined) {
			applyOwnership({ kind: "module", node: specifier, packageName })
		}
		inspectBindings(node)
		inspectUses(node)
		node.forEachChild(visit)
	}

	visit(sourceFile)
	return violations
}
