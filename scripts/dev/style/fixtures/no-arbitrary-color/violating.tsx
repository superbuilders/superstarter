export function ArbitraryColorFixture() {
	return (
		<div
			data-slot="arbitrary-color-fixture"
			className="bg-[#fff]" // violation
		>
			<span
				className="text-[oklch(0.5_0.1_200)]" // violation
			/>
		</div>
	)
}
