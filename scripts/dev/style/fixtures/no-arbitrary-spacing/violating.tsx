export function ArbitrarySpacingFixture() {
	return (
		<div
			data-slot="arbitrary-spacing-fixture"
			className="p-[37px]" // violation
		>
			<span
				className="gap-[18px]" // violation
			/>
		</div>
	)
}
