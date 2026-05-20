import { Button } from "@/components/ui/button"
import type { ExperimentalPracticeTestPrimerData } from "@/server/experimental/practice-test-data"

interface ExperimentalPracticeTestPrimerCardProps {
	primer: ExperimentalPracticeTestPrimerData
}

function ExperimentalPracticeTestPrimerCard(props: ExperimentalPracticeTestPrimerCardProps) {
	const { primer } = props
	return (
		<section className="rounded-2xl border border-border-soft bg-panel px-6 py-6 shadow-sm">
			<div className="space-y-2">
				<p className="font-semibold text-[11px] text-cobalt uppercase tracking-[0.06em]">
					Mixed-session entry
				</p>
				<h2 className="font-medium text-text-1 text-xl">Experimental Practice Test</h2>
				<p className="max-w-[64ch] text-sm text-text-2">
					This Experimental practice test builds a mixed queue from unaudited experimental items
					only. It creates an experimental session and writes experimental attempts only.
				</p>
			</div>
			<div className="mt-5 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
				<div className="space-y-1 text-sm text-text-2">
					<p>
						Available experimental items:{" "}
						<span className="font-medium text-text-1">{primer.availableCount}</span>
					</p>
					<p>
						Experimental subtypes represented:{" "}
						<span className="font-medium text-text-1">{primer.availableSubTypeCount}</span>
					</p>
					<p>
						Minimum needed for the MVP mixed run:{" "}
						<span className="font-medium text-text-1">{primer.minimumReadyCount}</span>
						{" "}items across at least{" "}
						<span className="font-medium text-text-1">{primer.minimumSubTypeCount}</span>
						subtypes.
					</p>
				</div>
				<div>
					{primer.readyToStart ? (
						<Button asChild size="lg">
							<a href={primer.startHref}>Start Experimental practice test</a>
						</Button>
					) : (
						<Button disabled size="lg">
							Not enough experimental items yet
						</Button>
					)}
				</div>
			</div>
		</section>
	)
}

export { ExperimentalPracticeTestPrimerCard }
