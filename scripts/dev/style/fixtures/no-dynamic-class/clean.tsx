export function WholeClassFixture({ wide }: Readonly<{ wide: boolean }>) {
	return (
		<div
			data-slot="whole-class-fixture"
			className={`flex ${wide ? "w-full" : "w-1/2"} items-center`}
		>
			<span className={`${wide ? "p-4" : "p-2"}`} />
		</div>
	)
}
