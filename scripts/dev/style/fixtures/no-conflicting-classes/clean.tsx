import { cn } from "#lib/cn.ts"

export function ComposedFixture({ active }: Readonly<{ active: boolean }>) {
	return (
		<div data-slot="composed-fixture" className="flex flex-col p-2 px-4 hover:p-4">
			<span className="text-sm leading-6 text-muted-foreground" />
			<span className="ring-3 shadow-sm ring-ring/50" />
			<span className={cn("p-2", active && "p-4")} />
			<span className="border border-input mx-auto ml-2" />
		</div>
	)
}
