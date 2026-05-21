// Tracking artifact for the `bun run scripts/dev/fmt.ts --strip-comments`
// parser bug discovered while installing lefthook in commit
// `chore(repo): install lefthook + sweep accumulated lint debt`.
//
// CONTEXT
// -------
// fmt.ts has two passes: (1) strip comments (with `--strip-comments`),
// (2) brace-insertion ("All control flow must use curly braces"). When
// both are applied to a file containing an `if / else if / ... / else`
// chain whose final `else` block uses a `never`-exhaustiveness pattern
// (`const _exhaustive: never = X; return _exhaustive`), the brace pass
// can corrupt the closing `}` of the `else` block by joining it with
// truncated tail characters of the `_exhaustive` identifier — producing
// e.g. `}ive` literal text on multiple lines, breaking parse.
//
// CONCRETE EVIDENCE (from src/server/items/selection.ts, function
// `nextDifficultyTier`)
// -----------------------------------------------------------
// BEFORE (pristine, lines ~393-401):
//
//   if (cs === "learning") {
//     if (wm) { base = "medium" } else { base = "easy" }
//   }
//   else if (cs === "fluent") base = "medium"
//   else if (cs === "mastered") base = "hard"
//   else if (cs === "decayed") base = "medium"
//   else {
//     const _exhaustive: never = cs
//     return _exhaustive
//   }
//
// AFTER (post-format, lines ~365-374):
//
//   else if (cs === "fluent") {
//     base = "medium"
//   } else if (cs === "mastered") base = "hard"
//   else if (cs === "decayed") base = "medium"
//   else {
//     const _exhaustive: never = cs
//     return _exhaustive
//   }ive            ← suffix `ive` of `_exhaustive` joined to brace
//   }ive            ← repeated, second mangled brace
//   }
//
// Symptom: `tsgo --noEmit` fails with TS1128 ("Declaration or statement
// expected") at the two `}ive` lines.
//
// REPRODUCTION ATTEMPT
// --------------------
// The shape below mirrors the `nextDifficultyTier` chain. Running
// `bun run scripts/dev/fmt.ts --strip-comments --write` against this
// file alone does NOT reproduce the mangle — fmt.ts ignores the `--write
// <path>` argument and always scans the full tsconfig include set
// (problem 2 from the lefthook commit body), and when applied across the
// whole tree the bug fires only against selection.ts. The trigger
// likely needs additional file-graph context that selection.ts has and
// this minimal file lacks (sibling function bodies, specific comment
// density nearby, or the chain's exact statement ordering).
//
// REPRO STILL TODO
// ----------------
// To finish characterizing the bug, a future fix should:
//   1. Stage only this file + a copy of selection.ts under different
//      content shapes; bisect to find the minimal triggering shape.
//   2. Add a fmt.ts test harness so the reproduction can run as a unit
//      test rather than against the whole repo.
//
// DO NOT delete this file when fixing the formatter — convert it into
// the first test case under scripts/dev/fmt/__tests__/ once the harness
// exists.

type Difficulty = "easy" | "medium" | "hard" | "brutal"
type State = "learning" | "fluent" | "mastered" | "decayed"

function reproDifficultyChain(state: State, wasMastered: boolean): Difficulty {
	const cs = state
	const wm = wasMastered
	let base: Difficulty
	if (cs === "learning") {
		if (wm) {
			base = "medium"
		} else {
			base = "easy"
		}
	} else if (cs === "fluent") base = "medium"
	else if (cs === "mastered") base = "hard"
	else if (cs === "decayed") base = "medium"
	else {
		const _exhaustive: never = cs
		return _exhaustive
	}
	if (base === "hard") {
		return "medium"
	}
	return base
}

export { reproDifficultyChain }
