import * as React from "react"
import { AdminGateClient, type AdminGateResult } from "@/app/(admin)/_admin-gate-client"
import { requireAdminEmail } from "@/server/auth/admin-gate"

function AdminLayout({ children }: { children: React.ReactNode }) {
	// requireAdminEmail() throws on a missing/non-allowlisted session. Convert
	// that rejection into a resolved Result so the client component renders a
	// quiet "admin-only" message instead of triggering the framework error
	// boundary (which would leak structure of the route tree).
	const gatePromise: Promise<AdminGateResult> = requireAdminEmail().then(
		function onAllowed(context) {
			return { allowed: true, context }
		},
		function onDenied() {
			return { allowed: false }
		}
	)

	return (
		<React.Suspense fallback={null}>
			<AdminGateClient gatePromise={gatePromise}>{children}</AdminGateClient>
		</React.Suspense>
	)
}

export default AdminLayout
