export function SlottedFixture() {
	return <div data-slot="slotted-fixture" className="flex" />
}

export function WrappingFixture() {
	return (
		<section className="flex">
			<SlottedFixture />
			<p data-slot="wrapping-fixture" />
		</section>
	)
}

export function helperFixture() {
	return <span className="flex" />
}
