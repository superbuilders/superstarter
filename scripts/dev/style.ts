#!/usr/bin/env -S node

import { NodeRuntime, NodeServices } from "@effect/platform-node"
import { Array as Arr, Console, Effect, FileSystem, Path, Schema, String as Str } from "effect"
import { DevtoolFailure, exitWith, reportFailure } from "#scripts/dev/devtool-failure.ts"
import { invocationOf } from "#scripts/dev/shared/arguments.ts"
import { jsonEncoder } from "#scripts/dev/shared/json.ts"
import { configFileNames, nativeSession } from "#scripts/dev/shared/native-api.ts"
import { parseSyntax, type SyntaxSource } from "#scripts/dev/shared/native-syntax.ts"
import { appRoot, covers, isGeneratedPath, repositoryPath } from "#scripts/dev/shared/repository.ts"
import { extractClasses } from "#scripts/dev/style/class-extractor.ts"
import { ComponentsConfig, loadDesignSystem } from "#scripts/dev/style/design-system.ts"
import { noArbitraryRadius } from "#scripts/dev/style/rules/no-arbitrary-radius.ts"
import { noArbitraryShadow } from "#scripts/dev/style/rules/no-arbitrary-shadow.ts"
import { noArbitrarySpacing } from "#scripts/dev/style/rules/no-arbitrary-spacing.ts"
import { noDuplicateDataSlot } from "#scripts/dev/style/rules/no-duplicate-data-slot.ts"
import { noInvalidColor } from "#scripts/dev/style/rules/no-invalid-color.ts"
import { noUnresolvedClass } from "#scripts/dev/style/rules/no-unresolved-class.ts"
import { requireDataSlot } from "#scripts/dev/style/rules/require-data-slot.ts"
import { type ClassRule, type DesignSystem, StyleViolation } from "#scripts/dev/style/types.ts"

/**
 * The style linter: design-token enforcement over the TSX files of the app's tsconfig, against the full Tailwind v4
 * design system that the app's components.json stylesheet defines. Classes must compile, colors must be theme tokens,
 * arbitrary spacing, radius and shadow values are banned, and components carry unique data-slot attributes.
 * Explicit paths narrow the files (a TSX file the tsconfig excludes is added); `--json` prints the violations.
 */

const CLASS_RULES: ReadonlyArray<ClassRule> = [
	noUnresolvedClass,
	noInvalidColor,
	noArbitrarySpacing,
	noArbitraryRadius,
	noArbitraryShadow
]

const encodeViolations = jsonEncoder(Schema.Array(StyleViolation))

const decodeComponentsConfig = Schema.decodeUnknownEffect(Schema.fromJsonString(ComponentsConfig))

const isStyledSource = (file: string): boolean =>
	Str.endsWith(".tsx")(file) && !isGeneratedPath(file)

const violationsOf = (
	sources: ReadonlyArray<SyntaxSource>,
	system: DesignSystem
): ReadonlyArray<StyleViolation> => [
	...noDuplicateDataSlot(sources),
	...Arr.flatMap(sources, (source) => {
		const classes = extractClasses(source)
		return [
			...requireDataSlot(source),
			...Arr.flatMap(CLASS_RULES, (rule) => rule({ classes, system }))
		]
	})
]

const renderText = (violations: ReadonlyArray<StyleViolation>): string => {
	const lines = Arr.map(violations, (violation) => {
		const detail = violation.className === undefined ? "" : ` (${violation.className})`
		return `${repositoryPath(violation.file)}:${violation.line}:${violation.column} ${violation.rule}: ${violation.message}${detail}`
	})
	return Arr.join([...lines, `style: ${violations.length} violation(s)`], "\n")
}

const main = Effect.gen(function* () {
	const fs = yield* FileSystem.FileSystem
	const path = yield* Path.Path
	const invocation = yield* invocationOf(["--json"])
	const selected = Arr.map(invocation.paths, (argument) => path.resolve(argument))
	const componentsText = yield* fs.readFileString(`${appRoot}/components.json`).pipe(
		Effect.mapError((cause) =>
			DevtoolFailure.make({
				detail:
					"components.json is missing: the style linter loads the design system from the stylesheet it names (tailwind.css). Run shadcn init first.",
				cause
			})
		)
	)
	const components = yield* decodeComponentsConfig(componentsText).pipe(
		Effect.mapError((cause) =>
			DevtoolFailure.make({
				detail: "components.json must name the stylesheet in tailwind.css",
				cause
			})
		)
	)
	const entry = path.resolve(appRoot, components.tailwind.css)
	const css = yield* fs.readFileString(entry).pipe(
		Effect.mapError((cause) =>
			DevtoolFailure.make({
				detail: `${entry}, the stylesheet components.json names, could not be read`,
				cause
			})
		)
	)
	if (!Str.isNonEmpty(Str.trim(css))) {
		return yield* DevtoolFailure.make({
			detail: `${entry}, the stylesheet components.json names, is empty`
		})
	}
	const system = yield* loadDesignSystem({ css, base: path.dirname(entry), path: entry })
	const configured = yield* Effect.scoped(
		Effect.flatMap(nativeSession({ cwd: appRoot }), (api) =>
			configFileNames({ api, config: `${appRoot}/tsconfig.json` })
		)
	)
	const covered = Arr.isReadonlyArrayNonEmpty(selected)
		? Arr.filter(configured, (file) =>
				Arr.some(selected, (choice) => covers({ selected: choice, file }))
			)
		: configured
	const extra = Arr.filter(
		selected,
		(file) => isStyledSource(file) && !Arr.contains(configured, file)
	)
	const files = Arr.filter(Arr.dedupe([...covered, ...extra]), isStyledSource)
	const inputs = yield* Effect.forEach(
		files,
		(file) =>
			fs.readFileString(file).pipe(
				Effect.map((text) => ({ file, text })),
				Effect.mapError((cause) =>
					DevtoolFailure.make({ detail: `${file} could not be read`, cause })
				)
			),
		{ concurrency: 16 }
	)
	const violations = yield* Effect.scoped(
		Effect.flatMap(parseSyntax(inputs), (sources) =>
			Effect.try({
				try: () => violationsOf(sources, system),
				catch: (cause) => DevtoolFailure.make({ detail: "Style analysis failed", cause })
			})
		)
	)
	const output = invocation.flags.has("--json")
		? yield* encodeViolations(violations)
		: renderText(violations)
	yield* Console.log(output)
	if (Arr.isReadonlyArrayNonEmpty(violations)) {
		yield* exitWith(1)
	}
}).pipe(Effect.catchTag("DevtoolFailure", reportFailure))

// @effect-diagnostics-next-line strictEffectProvide:off
NodeRuntime.runMain(main.pipe(Effect.provide(NodeServices.layer)))
