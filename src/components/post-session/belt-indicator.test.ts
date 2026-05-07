// Pure-function unit tests for <BeltIndicator>'s exported helpers
// (sub-phase 5 commit 3). Plan: docs/plans/phase5-dojo-belt-
// indicator.md §7.1.
//
// Audit-against-actual-artifact (SPEC §6.14.18): the codebase has no
// component-test infrastructure (no DOM shim, no React Testing
// Library, no per-component .test.tsx files). All existing tests are
// pure-function or server-integration. Plan §7.1's "component tests
// via the test infrastructure already established for sub-phase 1's
// components" referenced infrastructure that doesn't exist; the
// audit-against-actual-artifact discipline shifts component-render
// integration to commit 4's real-DB harness per plan §9. Commit 3
// ships only the pure-function helpers + their tests, plus the
// component file itself (compiled by typecheck + biome lint).
//
// Four scenarios — one per Difficulty → BeltColor mapping per plan
// §5.2. Plus three cover-all sanity tests for the display-name
// helpers (one per identity check that easy/medium/hard/brutal hit
// the four-arm exhaustive switch in tierDisplayName + tier ↔ color
// round-trip).

import { expect, test } from "bun:test"
import {
	beltColorDisplayName,
	tierDisplayName,
	tierToBeltColor
} from "@/components/post-session/belt-indicator"

test("tierToBeltColor: easy → white", function easyToWhite() {
	expect(tierToBeltColor("easy")).toBe("white")
})

test("tierToBeltColor: medium → blue", function mediumToBlue() {
	expect(tierToBeltColor("medium")).toBe("blue")
})

test("tierToBeltColor: hard → brown", function hardToBrown() {
	expect(tierToBeltColor("hard")).toBe("brown")
})

test("tierToBeltColor: brutal → black", function brutalToBlack() {
	expect(tierToBeltColor("brutal")).toBe("black")
})

test("beltColorDisplayName: round-trip from each tier yields capitalized color", function roundTripDisplay() {
	expect(beltColorDisplayName(tierToBeltColor("easy"))).toBe("White")
	expect(beltColorDisplayName(tierToBeltColor("medium"))).toBe("Blue")
	expect(beltColorDisplayName(tierToBeltColor("hard"))).toBe("Brown")
	expect(beltColorDisplayName(tierToBeltColor("brutal"))).toBe("Black")
})

test("tierDisplayName: capitalizes each tier", function tierLabels() {
	expect(tierDisplayName("easy")).toBe("Easy")
	expect(tierDisplayName("medium")).toBe("Medium")
	expect(tierDisplayName("hard")).toBe("Hard")
	expect(tierDisplayName("brutal")).toBe("Brutal")
})
