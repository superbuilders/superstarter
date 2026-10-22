import { cva } from "class-variance-authority"

const tones = cva("inline-flex", {
	variants: {
		tone: {
			calm: "bg-primary bg-secondary" // violation
		}
	}
})

export function ConflictingFixture() {
	return (
		<div
			data-slot="conflicting-fixture"
			className="flex hidden" // violation
		>
			<span
				className="p-2 p-4 hover:p-2 hover:p-4" // violation
			/>
			<span
				className="text-sm text-lg" // violation
			/>
			<span className={tones({ tone: "calm" })} />
		</div>
	)
}
