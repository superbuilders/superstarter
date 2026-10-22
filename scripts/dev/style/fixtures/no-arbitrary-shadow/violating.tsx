export function ArbitraryShadowFixture() {
	return (
		<div
			data-slot="arbitrary-shadow-fixture"
			className="shadow-[0_4px_12px_rgba(0,0,0,0.1)]" // violation
		/>
	)
}
