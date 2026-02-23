import { codeFunction } from "@/inngest/functions/agents/code"
import { exploreFunction } from "@/inngest/functions/agents/explore"
import { echoFunction } from "@/inngest/functions/debug/echo"
import { createFunction } from "@/inngest/functions/sandbox/create"
import { stopFunction } from "@/inngest/functions/sandbox/stop"

const functions = [codeFunction, exploreFunction, echoFunction, createFunction, stopFunction]

export { functions }
