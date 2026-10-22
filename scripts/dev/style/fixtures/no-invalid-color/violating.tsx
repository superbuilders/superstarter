export function PaletteFixture() {
	return (
		<div
			data-slot="palette-fixture"
			className="bg-blue-500" // violation
		>
			<span
				className="hover:text-gray-700/50" // violation
			/>
		</div>
	)
}
