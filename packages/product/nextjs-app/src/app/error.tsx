"use client"

import { useEffect } from "react"
import { captureProductException } from "#lib/product-analytics.ts"

/** Routes without their own boundary fail here, inside the root layout, so the replay that
 * recorded the failure stays mounted, which `global-error` cannot keep. The error is captured
 * whole, with the digest that joins a Server Component failure to its server log. The screen is
 * plain elements: a boundary should not depend on the kit whose failure it may be showing. */
export default function RootError({
	error,
	retry
}: Readonly<{ error: unknown; retry: () => void }>) {
	useEffect(() => {
		captureProductException(error, { boundary: "root" })
	}, [error])
	return (
		<main data-slot="root-error" className="flex min-h-dvh items-center justify-center p-6">
			<section className="flex w-full max-w-md flex-col gap-4 rounded-lg border p-8">
				<p className="text-lg font-semibold" role="alert">
					Something went wrong.
				</p>
				<button
					type="button"
					onClick={retry}
					className="self-start rounded-md border px-4 py-2 text-sm font-medium"
				>
					Try again
				</button>
			</section>
		</main>
	)
}
