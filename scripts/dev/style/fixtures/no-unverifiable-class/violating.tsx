import { cn } from "#lib/cn.ts"

const computed = String(1) // violation

export function UnverifiableFixture({ tone }: Readonly<{ tone: string }>) {
	return (
		<div
			data-slot="unverifiable-fixture"
			className={tone} // violation
		>
			<span className={cn("flex", computed)} />
			<span
				className={cn("flex", tone.trim())} // violation
			/>
		</div>
	)
}
