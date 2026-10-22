import { cn } from "#lib/cn.ts"

export function SingleClassFixture({ active }: Readonly<{ active: boolean }>) {
	return (
		<div data-slot="single-class-fixture" className={cn("flex", active && "flex")}>
			<span className={active ? "p-2" : "p-2 m-2"} />
		</div>
	)
}
