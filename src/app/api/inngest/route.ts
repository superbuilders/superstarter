import { serve } from "inngest/next"
import type { NextRequest } from "next/server"

import { todosSubscription } from "@/db/programs/subscriptions/todos"
import { inngest } from "@/inngest"

const handlers = serve({
	client: inngest,
	functions: [...todosSubscription.createFunctions(inngest)]
})

type AppRouteHandler = (
	request: NextRequest,
	context: {
		params: Promise<Record<string, unknown>>
	}
) => Response | undefined | Promise<Response | undefined>

const invoke = Function.prototype.apply

function adapt(handler: typeof handlers.GET): AppRouteHandler {
	return (request, context) => {
		const result = invoke.call(handler, undefined, [request, context])
		return Promise.resolve(result)
	}
}

const GET = adapt(handlers.GET)
const POST = adapt(handlers.POST)
const PUT = adapt(handlers.PUT)

export { GET, POST, PUT }
