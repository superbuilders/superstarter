"use client"

import * as React from "react"
import type { AdminContext } from "@/server/auth/admin-gate"

interface AdminGateResult {
	allowed: boolean
	context?: AdminContext
}

interface AdminGateClientProps {
	gatePromise: Promise<AdminGateResult>
	children: React.ReactNode
}

function AdminGateClient(props: AdminGateClientProps) {
	const result = React.use(props.gatePromise)
	if (!result.allowed) {
		return (
			<main className="flex min-h-dvh items-center justify-center px-6">
				<p className="text-muted-foreground text-sm">This area is admin-only.</p>
			</main>
		)
	}
	return props.children
}

export type { AdminGateResult }
export { AdminGateClient }
