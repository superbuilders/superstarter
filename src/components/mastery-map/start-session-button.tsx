// <StartSessionButton> — primary CTA on the Mastery Map. Plan §6.3.
//
// The label is computed from the recommended next session: lowest-mastery
// sub-type, with deterministic tie-break by lexicographic sub_type_id.
// Per Phase 3, the only timer mode is `standard` and the only path is
// drill, so the CTA always lands on /drill/<sub-type>. If/when every
// sub-type is mastered, the plan §1.5 spec says the CTA degrades to
// "Start full-length test" — but full-length is Phase 5, so for Phase 3
// the page always renders the drill CTA (the recommended-sub-type
// promise still picks SOMETHING; if every state is mastered the
// alphabetic tie-break picks numerical.averages as it's first
// lexicographically — see recommended-next-session.ts).

import type { SubTypeId } from "@/config/sub-types"
import { Button } from "@/components/ui/button"

interface StartSessionButtonProps {
	subTypeId: SubTypeId
	displayName: string
}

function StartSessionButton(props: StartSessionButtonProps) {
	const href = `/drill/${props.subTypeId}`
	return (
		<Button asChild size="lg">
			<a href={href}>Enter dojo: {props.displayName}</a>
		</Button>
	)
}

export type { StartSessionButtonProps }
export { StartSessionButton }
