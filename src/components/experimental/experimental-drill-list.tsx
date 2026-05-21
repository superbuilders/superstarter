import type { ExperimentalDrillIndexData } from "@/server/experimental/drill-data"

interface ExperimentalDrillListProps {
	data: ExperimentalDrillIndexData
}

function ExperimentalDrillList(props: ExperimentalDrillListProps) {
	return (
		<div className="space-y-8">
			{props.data.sections.map(function renderSection(section) {
				return (
					<section key={section.id} className="space-y-3">
						<header className="space-y-1">
							<h2 className="font-medium text-lg text-text-1">{section.label}</h2>
							<p className="text-sm text-text-2">
								Experimental drills need at least {props.data.minimumReadyCount} unaudited items to start.
							</p>
						</header>
						<div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
							{section.entries.map(function renderEntry(entry) {
								const statusLabel = entry.readyToStart
									? `${entry.availableCount} items ready`
									: `${entry.availableCount}/${props.data.minimumReadyCount} items available`
								const content = (
									<>
										<div className="space-y-1">
											<h3 className="font-medium text-base text-text-1">{entry.displayName}</h3>
											<p className="text-sm text-text-2">
												{entry.readyToStart
													? "Subtype primer and run route are available."
													: "Subtype route is available, but the pool is still below the MVP drill threshold."}
											</p>
										</div>
										<span className="font-medium text-[11px] text-cobalt uppercase tracking-[0.06em]">
											{statusLabel}
										</span>
									</>
								)
								if (entry.readyToStart) {
									return (
										<a
											key={entry.subTypeId}
											href={entry.href}
											className="flex h-full flex-col justify-between rounded-xl border border-border-soft bg-panel px-5 py-4 transition-colors hover:border-cobalt/40 hover:bg-panel/90"
										>
											{content}
										</a>
									)
								}
								return (
									<div
										key={entry.subTypeId}
										className="flex h-full flex-col justify-between rounded-xl border border-border-soft bg-panel/60 px-5 py-4 opacity-80"
									>
										{content}
									</div>
								)
							})}
						</div>
					</section>
				)
			})}
		</div>
	)
}

export { ExperimentalDrillList }
