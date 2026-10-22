#!/usr/bin/env -S node

import {
	Array as Arr,
	Console,
	Effect,
	FileSystem,
	Option,
	Order,
	Path,
	Result,
	Schema,
	String as Str
} from "effect"
import type * as ts from "typescript/unstable/ast"
import type { Project } from "typescript/unstable/sync"
import { invocationOf } from "#scripts/dev/shared/arguments.ts"
import { DevtoolFailure, runDevtool } from "#scripts/dev/shared/devtool.ts"
import {
	type Finding,
	findingAt,
	type Report,
	renderFindings,
	statusOf
} from "#scripts/dev/shared/finding.ts"
import { fixtureMismatchesOf, renderFixtureMismatches } from "#scripts/dev/shared/fixtures.ts"
import { nativeSession, openProgram, openProject } from "#scripts/dev/shared/native-api.ts"
import {
	appRoot,
	covers,
	isGeneratedPath,
	isTypeScriptPath,
	repositoryRoot
} from "#scripts/dev/shared/repository.ts"
import { selectFiles } from "#scripts/dev/shared/selection.ts"
import { prepareSemantics } from "#scripts/dev/shared/semantic.ts"
import { classExtractor } from "#scripts/dev/style/class-extractor.ts"
import { isComponentFile } from "#scripts/dev/style/components.ts"
import {
	ComponentsConfig,
	type DesignSystem,
	loadDesignSystem
} from "#scripts/dev/style/design-system.ts"
import { noConflictingClasses, noDuplicateClass } from "#scripts/dev/style/rules/class-lists.ts"
import { noArbitraryColor, noInvalidColor } from "#scripts/dev/style/rules/colors.ts"
import { noArbitraryRadius } from "#scripts/dev/style/rules/no-arbitrary-radius.ts"
import { noArbitraryShadow } from "#scripts/dev/style/rules/no-arbitrary-shadow.ts"
import { noArbitrarySpacing } from "#scripts/dev/style/rules/no-arbitrary-spacing.ts"
import { noDuplicateDataSlot } from "#scripts/dev/style/rules/no-duplicate-data-slot.ts"
import { noUnresolvedClass } from "#scripts/dev/style/rules/no-unresolved-class.ts"
import { requireDataSlot } from "#scripts/dev/style/rules/require-data-slot.ts"
import { type ClassRule, STYLE_RULES, type StyleRule } from "#scripts/dev/style/types.ts"

/**
 * The style linter: design-token enforcement over the app's source, read with the app's own checker, against the
 * full Tailwind v4 design system that the stylesheet components.json names defines. Every class must be readable
 * and compile; colors are theme tokens; arbitrary spacing, radius and shadow values are banned; one class list
 * never sets a property twice; components carry unique data-slot attributes. Explicit paths narrow the files (a
 * file the tsconfig excludes is added); `--fixtures` runs every rule against its fixtures instead.
 */

const CLASS_RULES: ReadonlyArray<Readonly<{ id: StyleRule; check: ClassRule }>> = [
	{ id: "no-unresolved-class", check: noUnresolvedClass },
	{ id: "no-conflicting-classes", check: noConflictingClasses },
	{ id: "no-duplicate-class", check: noDuplicateClass },
	{ id: "no-invalid-color", check: noInvalidColor },
	{ id: "no-arbitrary-color", check: noArbitraryColor },
	{ id: "no-arbitrary-spacing", check: noArbitrarySpacing },
	{ id: "no-arbitrary-radius", check: noArbitraryRadius },
	{ id: "no-arbitrary-shadow", check: noArbitraryShadow }
]

const decodeComponentsConfig = Schema.decodeUnknownEffect(Schema.fromJsonString(ComponentsConfig))

/** The design system the app's components.json names. */
const appDesignSystem = Effect.gen(function* () {
	const fs = yield* FileSystem.FileSystem
	const path = yield* Path.Path
	const componentsText = yield* fs.readFileString(`${appRoot}/components.json`).pipe(
		Effect.mapError((cause) =>
			DevtoolFailure.make({
				detail:
					"components.json is missing: the style linter loads the design system from the stylesheet it names. Run shadcn init first.",
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
	return yield* loadDesignSystem({ css, base: path.dirname(entry), path: entry })
})

const stamped =
	(rule: StyleRule) =>
	(report: Report): Finding =>
		findingAt({ sourceFile: report.node.getSourceFile(), rule, report })

/** Every rule over a program's files: what the extractor found unreadable, every class rule over every class
 * list, and the data-slot rules over the files that hold components. */
const styleFindingsOf = (
	input: Readonly<{
		project: Project
		files: ReadonlyArray<ts.SourceFile>
		isComponent: (file: string) => boolean
		system: DesignSystem
	}>
) =>
	Effect.gen(function* () {
		const { checker } = input.project
		const extracted = yield* Effect.try({
			try: () => {
				const extract = classExtractor(checker)
				return Arr.map(input.files, (sourceFile) =>
					extract({ sourceFile, semantics: prepareSemantics({ sourceFile, checker }) })
				)
			},
			catch: (cause) => DevtoolFailure.make({ detail: "The class extraction failed", cause })
		})
		const lists = yield* Effect.forEach(
			Arr.flatMap(extracted, (file) => file.lists),
			input.system.explain
		)
		const classFindings = Arr.flatMap(lists, (list) =>
			Arr.flatMap(CLASS_RULES, (rule) =>
				Arr.map(rule.check({ list, theme: input.system.theme }), (verdict): Finding => {
					const located = {
						file: verdict.token.file,
						line: verdict.token.line,
						column: verdict.token.column,
						rule: rule.id,
						message: verdict.message
					}
					return verdict.suggestion === undefined
						? located
						: { ...located, suggestion: verdict.suggestion }
				})
			)
		)
		const components = Arr.filter(input.files, (sourceFile) =>
			input.isComponent(sourceFile.fileName)
		)
		const slotFindings = yield* Effect.try({
			try: () => [
				...Arr.map(Arr.flatMap(components, requireDataSlot), stamped("require-data-slot")),
				...Arr.map(noDuplicateDataSlot(components), stamped("no-duplicate-data-slot"))
			],
			catch: (cause) => DevtoolFailure.make({ detail: "The data-slot rules failed", cause })
		})
		return [...Arr.flatMap(extracted, (file) => file.findings), ...classFindings, ...slotFindings]
	})

/** The program's own source files under a root, in name order, generated and declaration files aside. */
const sourcesUnder = (project: Project, root: string) =>
	Effect.try({
		try: () =>
			Arr.filterMap(
				Arr.sort(project.program.getSourceFileNames(), Order.String),
				(file): Result.Result<ts.SourceFile, void> => {
					const sourceFile =
						covers({ selected: root, file }) && !isGeneratedPath(file)
							? project.program.getSourceFile(file)
							: undefined
					if (sourceFile === undefined || sourceFile.isDeclarationFile) {
						return Result.failVoid
					}
					return Result.succeed(sourceFile)
				}
			),
		catch: (cause) =>
			DevtoolFailure.make({ detail: `The source files under ${root} could not be read`, cause })
	})

/** Each rule's fixtures compile in their own program, every fixture file a component file; no other tool reads
 * them. */
const FIXTURES_ROOT = `${repositoryRoot}/scripts/dev/style/fixtures`

const checkFixtures = (system: DesignSystem) =>
	Effect.gen(function* () {
		const mismatches = yield* Effect.scoped(
			Effect.gen(function* () {
				const api = yield* nativeSession({ cwd: FIXTURES_ROOT })
				const project = yield* openProject({ api, config: `${FIXTURES_ROOT}/tsconfig.json` })
				const files = yield* sourcesUnder(project, FIXTURES_ROOT)
				const findings = yield* styleFindingsOf({ project, files, isComponent: () => true, system })
				return fixtureMismatchesOf({
					root: FIXTURES_ROOT,
					extension: ".tsx",
					rules: STYLE_RULES,
					runOf: ({ rule, file }) =>
						Option.map(
							Arr.findFirst(files, (sourceFile) => sourceFile.fileName === file),
							(sourceFile) => ({
								text: sourceFile.text,
								reported: Arr.filterMap(findings, (finding) =>
									finding.file === file && finding.rule === rule
										? Result.succeed(finding.line)
										: Result.failVoid
								)
							})
						)
				})
			})
		)
		yield* Console.log(
			renderFixtureMismatches({ tool: "style", rules: STYLE_RULES.length, mismatches })
		)
		return statusOf(mismatches)
	})

const main = Effect.gen(function* () {
	const invocation = yield* invocationOf(["--fixtures"])
	const system = yield* appDesignSystem
	if (invocation.flags.has("--fixtures")) {
		return yield* checkFixtures(system)
	}
	const findings = yield* Effect.scoped(
		Effect.gen(function* () {
			const project = yield* openProgram({
				config: `${appRoot}/tsconfig.json`,
				extraFiles: Arr.filter(invocation.paths, isTypeScriptPath)
			})
			const sources = yield* sourcesUnder(project, appRoot)
			const selected = yield* selectFiles({
				available: Arr.map(sources, (sourceFile) => sourceFile.fileName),
				paths: invocation.paths
			})
			const files = Arr.filter(sources, (sourceFile) => Arr.contains(selected, sourceFile.fileName))
			return yield* styleFindingsOf({ project, files, isComponent: isComponentFile, system })
		})
	)
	yield* Console.log(renderFindings({ tool: "style", findings }))
	return statusOf(findings)
})

runDevtool(main)
