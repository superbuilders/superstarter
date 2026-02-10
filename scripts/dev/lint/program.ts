import { parseTsConfig } from "@scripts/dev/shared/files"
import * as logger from "@superbuilders/slog"
import * as ts from "typescript"

function createProgram(): ts.Program {
	const config = parseTsConfig()
	return ts.createProgram(config.fileNames, config.options)
}

export { createProgram, logger }
