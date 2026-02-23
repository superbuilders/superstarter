import { codeFunction } from "@/inngest/functions/agents/code"
import { exploreFunction } from "@/inngest/functions/agents/explore"
import { echoFunction } from "@/inngest/functions/debug/echo"

const functions = [codeFunction, exploreFunction, echoFunction]

export { functions }
