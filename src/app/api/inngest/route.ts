import { serve } from "inngest/next"
import type { NextRequest } from "next/server"

import { inngest } from "@/inngest/client"
import { functions } from "@/inngest/functions"

const handlers = serve({
	client: inngest,
	functions
})

type AppRouteHandler = (
	request: NextRequest,
	context: {
		params: Promise<Record<string, unknown>>
	}
) => Response | undefined | Promise<Response | undefined>

const invoke = Function.prototype.apply

const adapt = (handler: typeof handlers.GET): AppRouteHandler => {
	return (request, context) => {
		const result = invoke.call(handler, undefined, [request, context])
		return Promise.resolve(result)
	}
}

export const GET = adapt(handlers.GET)
export const POST = adapt(handlers.POST)
export const PUT = adapt(handlers.PUT)
