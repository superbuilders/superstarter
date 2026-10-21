"use client"

import NextError from "next/error"
import { useEffect } from "react"
import { captureProductException } from "#lib/product-analytics.ts"

/** A failure of the root layout itself: Next's native error presentation, captured whole. */
const GlobalError = ({ error }: Readonly<{ error: unknown }>) => {
	useEffect(() => {
		captureProductException(error, { boundary: "global" })
	}, [error])
	return (
		<html lang="en">
			<body>
				<NextError statusCode={0} />
			</body>
		</html>
	)
}

export default GlobalError
