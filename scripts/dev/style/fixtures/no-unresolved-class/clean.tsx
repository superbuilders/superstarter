import { cn } from "#lib/cn.ts"

export function ResolvedFixture({ active }: Readonly<{ active: boolean }>) {
	return (
		<div
			data-slot="resolved-fixture"
			className="group/fixture peer flex hover:bg-primary/80 dark:bg-input/30 rounded-[var(--radius-md)]"
		>
			<span className={cn("text-sm font-black", active && "font-medium", { underline: active })} />
			<span className="[&_svg]:size-4 group-hover/fixture:opacity-50 has-data-[icon=inline-end]:pr-2" />
		</div>
	)
}
