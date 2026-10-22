import { GeistSans } from "geist/font/sans"
import { cn } from "#lib/cn.ts"

const TONES = { calm: "text-muted-foreground", loud: "text-destructive" } as const

export function VerifiableFixture({
	className,
	tone,
	size,
	labelClassName
}: Readonly<{ className?: string; tone: keyof typeof TONES; size: "sm" | "lg"; labelClassName?: string }>) {
	const sized = size === "sm" ? "text-sm" : "text-lg"
	return (
		<div data-slot="verifiable-fixture" className={cn("flex", TONES[tone], sized, className)}>
			<span className={GeistSans.variable} />
			<span className={labelClassName} />
			<span className={size === "sm" ? "p-2" : undefined} />
		</div>
	)
}
