import { makeActionClient } from "@superstarter/todo-protocol/action"
import { isNextSignal } from "#lib/next-signal.ts"

/** Server actions as Effects for client components: Next's navigation signals escape to Next's
 * boundaries, and every other rejection is a request that never answered. */
export const callAction = makeActionClient(isNextSignal)
