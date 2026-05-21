import { Button } from "@/components/ui/button"

interface ExperimentalDrillEmptyPaneProps {
	title: string
	body: string
	backHref?: string
	backLabel?: string
}

function ExperimentalDrillEmptyPane(props: ExperimentalDrillEmptyPaneProps) {
	const backHref = props.backHref === undefined ? "/experimental/drills" : props.backHref
	const backLabel =
		props.backLabel === undefined ? "Back to Experimental Drills" : props.backLabel
	return (
		<section className="rounded-2xl border border-border-soft bg-panel px-6 py-6 shadow-sm">
			<div className="space-y-2">
				<h2 className="font-medium text-text-1 text-xl">{props.title}</h2>
				<p className="max-w-[64ch] text-sm text-text-2">{props.body}</p>
			</div>
			<div className="mt-5">
				<Button asChild variant="outline">
					<a href={backHref}>{backLabel}</a>
				</Button>
			</div>
		</section>
	)
}

export { ExperimentalDrillEmptyPane }
