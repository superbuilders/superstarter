import { Array as Arr, Effect, Record, Schema, type Scope, String as Str } from "effect"
import type { SourceFile } from "typescript/unstable/ast"
import { createVirtualFileSystem } from "typescript/unstable/fs"
import { DevtoolFailure } from "#scripts/dev/shared/devtool.ts"
import { jsonEncoder } from "#scripts/dev/shared/json.ts"
import { nativeSession, openProject } from "#scripts/dev/shared/native-api.ts"
import { repositoryRoot } from "#scripts/dev/shared/repository.ts"

export type SyntaxInput = Readonly<{ file: string; text: string }>

export type SyntaxSource = SyntaxInput & Readonly<{ sourceFile: SourceFile }>

/** Only parsing happens here: no library, no module resolution, no checking. */
const SyntaxConfig = Schema.Struct({
	compilerOptions: Schema.Struct({
		target: Schema.Literal("esnext"),
		jsx: Schema.Literal("preserve"),
		noLib: Schema.Literal(true),
		noResolve: Schema.Literal(true),
		types: Schema.Array(Schema.String)
	}),
	files: Schema.Array(Schema.String)
})

const encodeSyntaxConfig = jsonEncoder(SyntaxConfig)

/** The virtual extension picks the parser: JSX syntax only for .tsx and .jsx files. */
const virtualExtension = (file: string): string => {
	if (Str.endsWith(".tsx")(file) || Str.endsWith(".jsx")(file)) {
		return ".tsx"
	}
	return ".ts"
}

/**
 * Parses texts with the native compiler in a virtual file system. Reports use each input's real file, never the
 * virtual name. A syntax error is a failure, because rewriting a tree the parser had to repair corrupts the file.
 * The trees belong to the scope's compiler session.
 */
export const parseSyntax = (
	inputs: ReadonlyArray<SyntaxInput>
): Effect.Effect<ReadonlyArray<SyntaxSource>, DevtoolFailure, Scope.Scope> =>
	Effect.gen(function* () {
		const directory = `${repositoryRoot}/.native-syntax`
		const config = `${directory}/tsconfig.json`
		const entries = Arr.map(inputs, (input, index) => ({
			input,
			virtual: `${directory}/source-${index}${virtualExtension(input.file)}`
		}))
		const configText = yield* encodeSyntaxConfig({
			compilerOptions: {
				target: "esnext",
				jsx: "preserve",
				noLib: true,
				noResolve: true,
				types: []
			},
			files: Arr.map(entries, (entry) => entry.virtual)
		})
		const files = Record.fromEntries([
			[config, configText],
			...Arr.map(entries, (entry) => [entry.virtual, entry.input.text] as const)
		])
		const api = yield* nativeSession({ cwd: directory, fs: createVirtualFileSystem(files) })
		const { program } = yield* openProject({ api, config })
		const realFile = new Map(Arr.map(entries, (entry) => [entry.virtual, entry.input.file]))
		const diagnostics = yield* Effect.try({
			try: () => program.getSyntacticDiagnostics(),
			catch: (cause) => DevtoolFailure.make({ detail: "The native parser failed", cause })
		})
		if (Arr.isReadonlyArrayNonEmpty(diagnostics)) {
			return yield* DevtoolFailure.make({
				detail: Arr.join(
					Arr.map(diagnostics, (diagnostic) => {
						const file =
							diagnostic.fileName === undefined ? config : realFile.get(diagnostic.fileName)
						return `${file === undefined ? config : file}: ${diagnostic.text}`
					}),
					"\n"
				)
			})
		}
		return yield* Effect.forEach(entries, (entry) =>
			Effect.gen(function* () {
				const sourceFile = yield* Effect.try({
					try: () => program.getSourceFile(entry.virtual),
					catch: (cause) =>
						DevtoolFailure.make({ detail: `${entry.input.file} could not be parsed`, cause })
				})
				if (sourceFile === undefined) {
					return yield* DevtoolFailure.make({
						detail: `The native parser did not admit ${entry.input.file}`
					})
				}
				return { ...entry.input, sourceFile }
			})
		)
	})
