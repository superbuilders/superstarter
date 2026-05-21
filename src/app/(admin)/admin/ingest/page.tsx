import { IngestForm } from "@/app/(admin)/admin/ingest/_form"
import { subTypes } from "@/config/sub-types"

function IngestPage() {
	return (
		<main className="mx-auto max-w-3xl px-6 py-10">
			<header className="mb-8">
				<h1 className="font-semibold text-2xl tracking-tight">Real-item ingest</h1>
				<p className="mt-1 text-muted-foreground text-sm">
					Hand-author a CCAT item, classify and embed it. Internal admin only.
				</p>
			</header>
			<IngestForm subTypes={subTypes} />
		</main>
	)
}

export default IngestPage
