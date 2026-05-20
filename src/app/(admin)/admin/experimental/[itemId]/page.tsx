import * as React from "react"
import {
	AdminExperimentalItemDetailContent,
	AdminExperimentalItemDetailSkeleton
} from "@/app/(admin)/admin/experimental/[itemId]/content"
import { loadExperimentalAdminItemDetail } from "@/server/experimental/admin-data"

interface PageProps {
	params: Promise<{ itemId: string }>
}

function AdminExperimentalItemDetailPage(props: PageProps) {
	const detailPromise = props.params.then(function loadDetail(p) {
		return loadExperimentalAdminItemDetail(p.itemId)
	})
	return (
		<React.Suspense fallback={<AdminExperimentalItemDetailSkeleton />}>
			<AdminExperimentalItemDetailContent detailPromise={detailPromise} />
		</React.Suspense>
	)
}

export default AdminExperimentalItemDetailPage
