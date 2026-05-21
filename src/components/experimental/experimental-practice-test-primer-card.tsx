import { Button } from "@/components/ui/button"
import type { ExperimentalPracticeTestPrimerData } from "@/server/experimental/practice-test-data"

interface ExperimentalPracticeTestPrimerCardProps {
	primer: ExperimentalPracticeTestPrimerData
}

function ExperimentalPracticeTestPrimerCard(props: ExperimentalPracticeTestPrimerCardProps) {
	const { primer } = props
	const poolSupportsStandardDefault =
		primer.questionCountBounds.max >= primer.standardDefaultConfig.questionCount
	return (
		<section className="rounded-2xl border border-border-soft bg-panel px-6 py-6 shadow-sm">
			<div className="space-y-2">
				<p className="font-semibold text-[11px] text-cobalt uppercase tracking-[0.06em]">
					Mixed-session entry
				</p>
				<h2 className="font-medium text-text-1 text-xl">Experimental Practice Test</h2>
				<p className="max-w-[64ch] text-sm text-text-2">
					Configure a mixed Experimental run from the generated-question pool only. It creates an experimental session and writes experimental attempts only.
				</p>
			</div>
			<div className="mt-5 grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
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
						Standard default:{" "}
						<span className="font-medium text-text-1">
							{primer.standardDefaultConfig.questionCount} questions / {primer.standardDefaultConfig.durationMinutes} minutes
						</span>
					</p>
					<p>
						Current selectable range:{" "}
						<span className="font-medium text-text-1">
							{primer.questionCountBounds.min}-{primer.questionCountBounds.max} questions
						</span>
					</p>
					{poolSupportsStandardDefault ? null : (
						<p>
							The standard 50-question default will be available once the Experimental pool grows. For now, start with up to {primer.questionCountBounds.max} questions.
						</p>
					)}
				</div>
				<form action={primer.startHref} className="space-y-4 rounded-xl border border-border-soft bg-surface-1 p-4">
					<div className="grid gap-4 sm:grid-cols-2">
						<label className="space-y-2 text-sm text-text-2">
							<span className="font-medium text-text-1">Question count</span>
							<input
								type="number"
								name="questionCount"
								min={primer.questionCountBounds.min}
								max={primer.questionCountBounds.max}
								defaultValue={primer.defaultConfig.questionCount}
								className="w-full rounded-md border border-border-soft bg-bg px-3 py-2 text-text-1"
							/>
						</label>
						<label className="space-y-2 text-sm text-text-2">
							<span className="font-medium text-text-1">Test length (minutes)</span>
							<input
								type="number"
								name="durationMinutes"
								min={primer.durationBounds.min}
								max={primer.durationBounds.max}
								defaultValue={primer.defaultConfig.durationMinutes}
								className="w-full rounded-md border border-border-soft bg-bg px-3 py-2 text-text-1"
							/>
						</label>
					</div>
					<p className="text-sm text-text-2">
						Your selected settings are validated again on session start. If the pool changes before launch, the run page will show a clean blocked state instead of crashing.
					</p>
					<Button type="submit" size="lg">
						Start Experimental practice test
					</Button>
				</form>
			</div>
		</section>
	)
}

export { ExperimentalPracticeTestPrimerCard }
