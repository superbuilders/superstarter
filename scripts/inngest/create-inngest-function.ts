#!/usr/bin/env bun

/**
 * Create Inngest Function
 *
 * Scaffolds a new Inngest function with boilerplate, registers it in the
 * function index, and optionally stubs missing event schemas.
 *
 * Usage:
 *   bun scripts/inngest/create-inngest-function.ts <function-id> \
 *     -e <event-name> [-e <event-name>...] \
 *     [-c <cron-expression>...] \
 *     [-p <path>] \
 *     [--force]
 *
 * Examples:
 *   bun scripts/inngest/create-inngest-function.ts process-enrollment \
 *     -e superstarter/process-enrollment
 *
 *   bun scripts/inngest/create-inngest-function.ts sync-users \
 *     -e superstarter/sync-users \
 *     -e superstarter/user-updated \
 *     -c "0 * /6 * * *"
 *
 *   bun scripts/inngest/create-inngest-function.ts generate-questions \
 *     -e superstarter/generate-questions \
 *     -p ai/questions
 */

import { parseArgs } from "node:util"
import * as fs from "node:fs"
import * as path from "node:path"
import * as readline from "node:readline"
import * as ts from "typescript"
import * as errors from "@superbuilders/errors"
import * as logger from "@superbuilders/slog"

const KEBAB_RE = /^[a-z][a-z0-9]*(-[a-z0-9]+)*$/
const FUNCTIONS_DIR = "src/inngest/functions"
const FUNCTIONS_INDEX = "src/inngest/functions/index.ts"
const INNGEST_INDEX = "src/inngest/index.ts"

// --- CLI parsing ---

function parseCliArgs(): {
	functionId: string
	events: string[]
	crons: string[]
	subpath: string
	force: boolean
} {
	const { values, positionals } = parseArgs({
		args: process.argv.slice(2),
		options: {
			event: { type: "string", short: "e", multiple: true, default: [] },
			cron: { type: "string", short: "c", multiple: true, default: [] },
			path: { type: "string", short: "p", default: "" },
			force: { type: "boolean", default: false }
		},
		allowPositionals: true,
		strict: true
	})

	if (positionals.length !== 1) {
		logger.error("expected exactly one positional argument: <function-id>")
		process.exit(1)
	}

	const functionId = positionals[0]
	const events = values.event
	const crons = values.cron
	const subpath = values.path
	const force = values.force

	if (!functionId || !events || !crons || subpath === undefined || force === undefined) {
		logger.error("parseArgs returned unexpected undefined despite defaults")
		process.exit(1)
	}

	return { functionId, events, crons, subpath, force }
}

function validateArgs(args: {
	functionId: string
	events: string[]
	crons: string[]
	subpath: string
}): void {
	if (!KEBAB_RE.test(args.functionId)) {
		logger.error("function-id must be kebab-case", { functionId: args.functionId })
		process.exit(1)
	}

	if (args.events.length === 0 && args.crons.length === 0) {
		logger.error("must specify at least one -e or -c")
		process.exit(1)
	}

	for (const event of args.events) {
		if (!event.includes("/")) {
			logger.error("event name must contain a slash", { event })
			process.exit(1)
		}
		const parts = event.split("/")
		for (const part of parts) {
			if (!KEBAB_RE.test(part)) {
				logger.error("event name segments must be kebab-case", { event, segment: part })
				process.exit(1)
			}
		}
	}

	if (args.subpath) {
		const segments = args.subpath.split("/")
		for (const seg of segments) {
			if (!KEBAB_RE.test(seg)) {
				logger.error("path segments must be kebab-case", { path: args.subpath, segment: seg })
				process.exit(1)
			}
		}
	}
}

// --- Name derivation ---

function kebabToCamel(kebab: string): string {
	return kebab.replace(/-([a-z0-9])/g, (_, c: string) => c.toUpperCase())
}

// --- AST helpers ---

function findRegisteredEvents(sourceText: string): string[] {
	const sourceFile = ts.createSourceFile("index.ts", sourceText, ts.ScriptTarget.Latest, true)
	const events: string[] = []

	function visit(node: ts.Node): void {
		if (
			ts.isVariableDeclaration(node) &&
			ts.isIdentifier(node.name) &&
			node.name.text === "schema" &&
			node.initializer &&
			ts.isObjectLiteralExpression(node.initializer)
		) {
			for (const prop of node.initializer.properties) {
				if (ts.isPropertyAssignment(prop)) {
					if (ts.isStringLiteral(prop.name)) {
						events.push(prop.name.text)
					} else if (ts.isComputedPropertyName(prop.name)) {
						const expr = prop.name.expression
						if (ts.isStringLiteral(expr)) {
							events.push(expr.text)
						}
					}
				}
			}
		}
		ts.forEachChild(node, visit)
	}

	ts.forEachChild(sourceFile, visit)
	return events
}

function findSchemaObjectPosition(sourceText: string): {
	closingBracePos: number
	lastPropertyEnd: number
	hasProperties: boolean
} {
	const sourceFile = ts.createSourceFile("index.ts", sourceText, ts.ScriptTarget.Latest, true)
	let closingBracePos = -1
	let lastPropertyEnd = -1
	let hasProperties = false

	function visit(node: ts.Node): void {
		if (
			ts.isVariableStatement(node) &&
			node.declarationList.declarations.length > 0
		) {
			const decl = node.declarationList.declarations[0]
			if (
				ts.isIdentifier(decl.name) &&
				decl.name.text === "schema" &&
				decl.initializer &&
				ts.isObjectLiteralExpression(decl.initializer)
			) {
				const obj = decl.initializer
				closingBracePos = obj.getEnd() - 1
				hasProperties = obj.properties.length > 0
				if (hasProperties) {
					const lastProp = obj.properties[obj.properties.length - 1]
					lastPropertyEnd = lastProp.getEnd()
				}
			}
		}
		ts.forEachChild(node, visit)
	}

	ts.forEachChild(sourceFile, visit)
	return { closingBracePos, lastPropertyEnd, hasProperties }
}

function findFunctionsArrayPosition(sourceText: string): {
	lastImportEnd: number
	closingBracketPos: number
	lastElementEnd: number
	hasElements: boolean
} {
	const sourceFile = ts.createSourceFile("index.ts", sourceText, ts.ScriptTarget.Latest, true)
	let lastImportEnd = -1
	let closingBracketPos = -1
	let lastElementEnd = -1
	let hasElements = false

	function visit(node: ts.Node): void {
		if (ts.isImportDeclaration(node)) {
			lastImportEnd = node.getEnd()
		}

		if (
			ts.isVariableDeclaration(node) &&
			ts.isIdentifier(node.name) &&
			node.name.text === "functions" &&
			node.initializer &&
			ts.isArrayLiteralExpression(node.initializer)
		) {
			const arr = node.initializer
			closingBracketPos = arr.getEnd() - 1
			hasElements = arr.elements.length > 0
			if (hasElements) {
				const lastElem = arr.elements[arr.elements.length - 1]
				lastElementEnd = lastElem.getEnd()
			}
		}
		ts.forEachChild(node, visit)
	}

	ts.forEachChild(sourceFile, visit)
	return { lastImportEnd, closingBracketPos, lastElementEnd, hasElements }
}

// --- Text insertion ---

function applyInsertions(text: string, insertions: Array<{ pos: number; content: string }>): string {
	const sorted = [...insertions].sort((a, b) => b.pos - a.pos)
	let result = text
	for (const ins of sorted) {
		result = result.slice(0, ins.pos) + ins.content + result.slice(ins.pos)
	}
	return result
}

// --- Prompt ---

async function promptYesNo(message: string): Promise<boolean> {
	const rl = readline.createInterface({ input: process.stdin, output: process.stdout })
	return new Promise((resolve) => {
		rl.question(`${message} (Y/n) `, (answer) => {
			rl.close()
			const trimmed = answer.trim().toLowerCase()
			resolve(trimmed === "" || trimmed === "y" || trimmed === "yes")
		})
	})
}

// --- Scaffold generation ---

function buildTriggerCode(events: string[], crons: string[]): string {
	const triggers: string[] = []
	for (const e of events) {
		triggers.push(`{ event: "${e}" }`)
	}
	for (const c of crons) {
		triggers.push(`{ cron: "${c}" }`)
	}

	if (triggers.length === 1) {
		return triggers[0]
	}

	const inner = triggers.map((t) => `\t\t${t}`).join(",\n")
	return `[\n${inner}\n\t]`
}

function buildFunctionFile(functionId: string, camelName: string, events: string[], crons: string[]): string {
	const triggerCode = buildTriggerCode(events, crons)
	const hasEvents = events.length > 0

	const destructuredParams: string[] = []
	if (hasEvents) {
		destructuredParams.push("event")
	}
	destructuredParams.push("step", "publish", "logger")
	const paramsStr = destructuredParams.join(", ")

	return `import { inngest } from "@/inngest"

const ${camelName} = inngest.createFunction(
\t{ id: "${functionId}" },
\t${triggerCode},
\tasync ({ ${paramsStr} }) => {
\t\t// TODO: implement
\t}
)

export { ${camelName} }
`
}

// --- File mutations ---

function updateFunctionsIndex(camelName: string, importPath: string): void {
	const indexPath = path.resolve(FUNCTIONS_INDEX)
	const sourceText = fs.readFileSync(indexPath, "utf-8")

	const positions = findFunctionsArrayPosition(sourceText)
	if (positions.closingBracketPos === -1) {
		logger.error("could not find functions array in index")
		process.exit(1)
	}

	const insertions: Array<{ pos: number; content: string }> = []

	const importLine = `\nimport { ${camelName} } from "${importPath}"`
	if (positions.lastImportEnd !== -1) {
		insertions.push({ pos: positions.lastImportEnd, content: importLine })
	} else {
		insertions.push({ pos: 0, content: `${importLine}\n` })
	}

	const arrayEntry = positions.hasElements ? `, ${camelName}` : camelName
	insertions.push({ pos: positions.closingBracketPos, content: arrayEntry })

	const updated = applyInsertions(sourceText, insertions)
	fs.writeFileSync(indexPath, updated, "utf-8")
	logger.info("updated functions index", { file: FUNCTIONS_INDEX })
}

function updateInngestIndex(missingEvents: string[]): void {
	const indexPath = path.resolve(INNGEST_INDEX)
	const sourceText = fs.readFileSync(indexPath, "utf-8")

	const positions = findSchemaObjectPosition(sourceText)
	if (positions.closingBracePos === -1) {
		logger.error("could not find schema object in inngest index")
		process.exit(1)
	}

	const insertions: Array<{ pos: number; content: string }> = []

	const schemaEntries: string[] = []
	for (const event of missingEvents) {
		schemaEntries.push(`\t"${event}": z.object({\n\t\t// TODO: define event data schema\n\t})`)
	}

	if (positions.hasProperties) {
		const entryBlock = ",\n" + schemaEntries.join(",\n")
		insertions.push({ pos: positions.lastPropertyEnd, content: entryBlock })
	} else {
		const entryBlock = "\n" + schemaEntries.join(",\n") + "\n"
		insertions.push({ pos: positions.closingBracePos, content: entryBlock })
	}

	const updated = applyInsertions(sourceText, insertions)
	fs.writeFileSync(indexPath, updated, "utf-8")
	logger.info("updated inngest index with event schemas", { events: missingEvents })
}

// --- Main ---

async function main(): Promise<void> {
	const args = parseCliArgs()
	validateArgs(args)

	const camelName = kebabToCamel(args.functionId)
	const relDir = args.subpath
		? path.join(FUNCTIONS_DIR, args.subpath)
		: FUNCTIONS_DIR
	const filePath = path.join(relDir, `${args.functionId}.ts`)
	const importPath = args.subpath
		? `@/inngest/functions/${args.subpath}/${args.functionId}`
		: `@/inngest/functions/${args.functionId}`

	logger.info("scaffolding inngest function", {
		functionId: args.functionId,
		filePath,
		events: args.events,
		crons: args.crons
	})

	if (fs.existsSync(filePath)) {
		logger.error("file already exists", { filePath })
		process.exit(1)
	}

	// Step 1: Check for missing event schemas
	let missingEvents: string[] = []
	if (args.events.length > 0) {
		const inngestSource = fs.readFileSync(path.resolve(INNGEST_INDEX), "utf-8")
		const registered = findRegisteredEvents(inngestSource)
		missingEvents = args.events.filter((e) => !registered.includes(e))

		if (missingEvents.length > 0 && !args.force) {
			logger.info("missing event schemas detected", { missing: missingEvents })
			process.stdout.write("The following events are missing. Create stubs? (Y/n)\n")
			for (const e of missingEvents) {
				process.stdout.write(`    - ${e}\n`)
			}
			const confirmed = await promptYesNo("")
			if (!confirmed) {
				logger.info("aborted by user")
				process.exit(0)
			}
		}
	}

	// Step 2: Create directories + function file
	const absDir = path.resolve(relDir)
	fs.mkdirSync(absDir, { recursive: true })

	const content = buildFunctionFile(args.functionId, camelName, args.events, args.crons)
	fs.writeFileSync(filePath, content, "utf-8")
	logger.info("created function file", { filePath })

	// Step 3: Update functions index
	updateFunctionsIndex(camelName, importPath)

	// Step 4: Update inngest index (event schema stubs)
	if (missingEvents.length > 0) {
		updateInngestIndex(missingEvents)
	}

	logger.info("done", { functionId: args.functionId })
}

const result = await errors.try(main())
if (result.error) {
	logger.error("create-inngest-function failed", { error: result.error })
	process.exit(1)
}
