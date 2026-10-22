import { cva } from "class-variance-authority"
import { clsx } from "clsx"
import { twMerge } from "tailwind-merge"
import { cn } from "#lib/cn.ts"

const sizes = cva("inline-flex", {
	variants: {
		size: {
			sm: "h-7 gap-1",
			lg: "h-9 gap-huge" // violation
		}
	},
	compoundVariants: [{ size: "sm", class: "px-tiny" }] // violation
})

const muted = twMerge(clsx("text-muted-foregrund")) // violation

const LABELS = { quiet: "text-xs", loud: "text-xxl" } as const // violation

export function UnresolvedFixture({ active }: Readonly<{ active: boolean }>) {
	const titleClass = active ? "flex-1 line-thru" : "flex-1" // violation
	return (
		<div
			data-slot="unresolved-fixture"
			className="flex p-huge" // violation
		>
			<span
				className={cn("items-center", "bg-prmary")} // violation
			/>
			<span className={sizes({ size: "sm" })} />
			<span className={titleClass} />
			<span className={cn(muted, LABELS.loud)} />
		</div>
	)
}
