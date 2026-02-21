import { editFunction } from "@/inngest/functions/agents/fs/edit"
import { globFunction } from "@/inngest/functions/agents/fs/glob"
import { grepFunction } from "@/inngest/functions/agents/fs/grep"
import { readFunction } from "@/inngest/functions/agents/fs/read"
import { writeFunction } from "@/inngest/functions/agents/fs/write"
import { echoFunction } from "@/inngest/functions/debug/echo"

const functions = [
	readFunction,
	globFunction,
	grepFunction,
	writeFunction,
	editFunction,
	echoFunction
]

export { functions }
