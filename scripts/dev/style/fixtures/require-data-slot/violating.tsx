export function UnslottedFixture() {
	return <div className="flex" /> // violation
}

export const UnslottedArrowFixture = () => (
	<span className="flex" /> // violation
)
