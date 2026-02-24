import { tool } from "ai"
import { z } from "zod"

const MemoryKindSchema = z.enum(["insight", "failure", "decision", "constraint"])

type MemoryKind = z.infer<typeof MemoryKindSchema>

type MemoryRecord = {
	phase: string
	kind: string
	content: string
}

const createMemoryTool = tool({
	description: [
		"Create a memory record to preserve important findings, decisions, constraints, or failures for future phases.",
		"Use 'insight' for non-obvious discoveries,",
		"'failure' for things that didn't work,",
		"'decision' for meaningful choices,",
		"'constraint' for hard limitations."
	].join(" "),
	inputSchema: z.object({
		kind: MemoryKindSchema,
		content: z.string().min(1)
	})
})

const KIND_LABELS: Record<MemoryKind, string> = {
	insight: "Insights",
	failure: "Failures",
	decision: "Decisions",
	constraint: "Constraints"
}

const KIND_ORDER: MemoryKind[] = ["insight", "decision", "constraint", "failure"]

function formatMemoriesForPrompt(memories: MemoryRecord[]): string {
	if (memories.length === 0) {
		return ""
	}

	const grouped = new Map<string, MemoryRecord[]>()
	for (const memory of memories) {
		const existing = grouped.get(memory.kind)
		if (existing) {
			existing.push(memory)
		} else {
			grouped.set(memory.kind, [memory])
		}
	}

	const sections: string[] = []
	for (const kind of KIND_ORDER) {
		const records = grouped.get(kind)
		if (!records) {
			continue
		}
		const label = KIND_LABELS[kind]
		const lines = records.map(function formatLine(r) {
			return `- [${r.phase}] ${r.content}`
		})
		sections.push(`### ${label}\n${lines.join("\n")}`)
	}

	return `## Memory Records from Previous Phases\n\n${sections.join("\n\n")}`
}

export { MemoryKindSchema, createMemoryTool, formatMemoriesForPrompt }
export type { MemoryKind, MemoryRecord }
