interface ExperimentalEmptyPaneProps {
	title: string
	body: string
}

function ExperimentalEmptyPane(props: ExperimentalEmptyPaneProps) {
	return (
		<section className="rounded-2xl border border-border-soft bg-surface-1 p-6 shadow-[0_18px_60px_rgba(31,41,55,0.06)]">
			<h2 className="font-medium font-serif text-text-1 text-xl tracking-tight">{props.title}</h2>
			<p className="mt-2 max-w-[62ch] text-sm text-text-2 leading-6">{props.body}</p>
		</section>
	)
}

export { ExperimentalEmptyPane }
