import * as React from "react"
import { AdminExperimentalQueueContent, AdminExperimentalQueueSkeleton } from "@/app/(admin)/admin/experimental/content"
import { loadExperimentalAdminQueueData } from "@/server/experimental/admin-data"

function AdminExperimentalQueuePage() {
	const dataPromise = loadExperimentalAdminQueueData()
	return (
		<React.Suspense fallback={<AdminExperimentalQueueSkeleton />}>
			<AdminExperimentalQueueContent dataPromise={dataPromise} />
		</React.Suspense>
	)
}

export default AdminExperimentalQueuePage
