export function SecondSlotFixture() {
	return (
		<div
			data-slot="duplicate-fixture" // violation
			className="flex"
		/>
	)
}
