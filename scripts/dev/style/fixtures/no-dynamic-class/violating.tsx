export function DynamicFixture({ width, side }: Readonly<{ width: number; side: "l" | "r" }>) {
	return (
		<div
			data-slot="dynamic-fixture"
			className={`flex w-[${width}%]`} // violation
		>
			<span
				className={`p${side}-2 m-2`} // violation
			/>
		</div>
	)
}
