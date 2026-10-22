export function DuplicateClassFixture() {
	return (
		<div
			data-slot="duplicate-class-fixture"
			className="flex items-center flex" // violation
		/>
	)
}
