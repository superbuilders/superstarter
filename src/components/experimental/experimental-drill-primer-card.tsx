import { Button } from "@/components/ui/button"
import { DEFAULT_DRILL_QUESTIONS } from "@/config/sub-types"
import type { ExperimentalDrillPrimerData } from "@/server/experimental/drill-data"

interface ExperimentalDrillPrimerCardProps {
	primer: ExperimentalDrillPrimerData
}

function ExperimentalDrillPrimerCard(props: ExperimentalDrillPrimerCardProps) {
	const { primer } = props
	return (
		<section className="rounded-2xl border border-border-soft bg-panel px-6 py-6 shadow-sm">
			<div className="space-y-2">
				<p className="font-semibold text-[11px] text-cobalt uppercase tracking-[0.06em]">
					Subtype-specific entry
				</p>
				<h2 className="font-medium text-text-1 text-xl">{primer.displayName}</h2>
				<p className="max-w-[64ch] text-sm text-text-2">
					This Experimental drill uses the unaudited experimental pool only. It creates an
					experimental session and writes experimental attempts only.
				</p>
			</div>
			<div className="mt-5 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
				<div className="space-y-1 text-sm text-text-2">
					<p>
						Available experimental items: <span className="font-medium text-text-1">{primer.availableCount}</span>
					</p>
					<p>
						Minimum needed for the MVP drill run: <span className="font-medium text-text-1">{DEFAULT_DRILL_QUESTIONS}</span>
					</p>
				</div>
				<div>
					{primer.readyToStart ? (
						<Button asChild size="lg">
							<a href={primer.startHref}>Start Experimental drill</a>
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

export { ExperimentalDrillPrimerCard }
