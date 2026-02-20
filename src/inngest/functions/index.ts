import type { InngestFunction } from "inngest"
import { readFileFunction } from "@/inngest/functions/agents/fs/read-file"

const functions: InngestFunction.Any[] = [readFileFunction]

export { functions }
