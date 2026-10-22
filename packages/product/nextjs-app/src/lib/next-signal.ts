import { Result } from "effect"
import { unstable_rethrow } from "next/navigation"

/** Next's own control signals, `redirect()` and `notFound()`: `unstable_rethrow` throws exactly
 * those, on the server and in the browser alike. */
export const isNextSignal = (cause: unknown): boolean =>
	Result.isFailure(
		Result.try(() => {
			unstable_rethrow(cause)
		})
	)
