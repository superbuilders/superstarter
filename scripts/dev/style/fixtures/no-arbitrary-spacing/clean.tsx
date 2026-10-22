export function ThemeSpacingFixture() {
	return (
		<div data-slot="theme-spacing-fixture" className="p-4 h-[calc(--spacing(5.25))]">
			<span className="gap-[var(--fixture-gap)]" />
		</div>
	)
}
