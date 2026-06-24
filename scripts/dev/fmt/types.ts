interface CommentViolation {
	file: string
	line: number
	column: number
	text: string
	start: number
	end: number
}

interface BlankLineViolation {
	file: string
	line: number
	currentBlankLines: number
	targetBlankLines: number
	start: number
	end: number
}

interface CurlyBraceViolation {
	file: string
	line: number
	start: number
	end: number
	replacement: string
}

interface ExportToMove {
	name: string
	isType: boolean
	start: number
	exportKeywordEnd: number
}

interface ExistingExportClause {
	names: string[]
	isType: boolean
	start: number
	end: number
}

interface ExportAlias {
	originalName: string
	aliasName: string
	isType: boolean
}

interface InlineDefaultExport {
	name: string
	exportStart: number
	defaultEnd: number
}

interface ExportAnalysis {
	inlineExports: ExportToMove[]
	existingClauses: ExistingExportClause[]
	allValueNames: string[]
	allTypeNames: string[]
	hasDefault: boolean
	inlineDefault: InlineDefaultExport | null
	needsReorganization: boolean
	aliases: ExportAlias[]
}

interface ExportViolation {
	file: string
	line: number
	count: number
}

interface ReactImportViolation {
	file: string
	line: number
	/** The full import statement text */
	importText: string
	/** Names that need React. prefix */
	namedImports: string[]
}

interface FileResult {
	file: string
	commentViolations: CommentViolation[]
	blankLineViolations: BlankLineViolation[]
	curlyBraceViolations: CurlyBraceViolation[]
	exportViolations: ExportViolation[]
	reactImportViolations: ReactImportViolation[]
}

interface ExportCollector {
	inlineExports: ExportToMove[]
	existingClauses: ExistingExportClause[]
	allValueNames: string[]
	allTypeNames: string[]
	aliases: ExportAlias[]
	hasDefault: boolean
	inlineDefault: InlineDefaultExport | null
}

interface ReactImportCollection {
	importsToFix: Map<string, string>
	hasNamespaceImport: boolean
	importRangesToRemove: Array<{ start: number; end: number }>
}

export type {
	BlankLineViolation,
	CommentViolation,
	CurlyBraceViolation,
	ExistingExportClause,
	ExportAlias,
	ExportAnalysis,
	ExportCollector,
	ExportToMove,
	ExportViolation,
	FileResult,
	InlineDefaultExport,
	ReactImportCollection,
	ReactImportViolation
}
