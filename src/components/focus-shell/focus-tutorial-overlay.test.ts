import { expect, test } from "bun:test"
import { resolveTutorialCardLayout } from "@/components/focus-shell/focus-tutorial-overlay"

test("resolveTutorialCardLayout keeps the card inside the viewport and off the spotlight when there is side space", () => {
	const layout = resolveTutorialCardLayout({
		measureHeight() {
			return 320
		},
		preferredPlacement: "bottom-right",
		spotlight: { top: 180, left: 120, width: 260, height: 110 },
		viewportWidth: 1280,
		viewportHeight: 720
	})
	expect(layout.overlapsSpotlight).toBe(false)
	expect(layout.left).toBeGreaterThanOrEqual(16)
	expect(layout.top).toBeGreaterThanOrEqual(16)
	expect(layout.left + layout.width).toBeLessThanOrEqual(1280 - 16)
	expect(layout.top + layout.height).toBeLessThanOrEqual(720 - 16)
	expect(layout.width).toBeGreaterThan(360)
	expect(layout.needsScroll).toBe(false)
})

test("resolveTutorialCardLayout constrains height when the viewport is tight", () => {
	const layout = resolveTutorialCardLayout({
		measureHeight() {
			return 640
		},
		preferredPlacement: "top-right",
		spotlight: { top: 260, left: 90, width: 220, height: 90 },
		viewportWidth: 420,
		viewportHeight: 360
	})
	expect(layout.height).toBeLessThanOrEqual(360 - 32)
	expect(layout.width).toBeLessThanOrEqual(420 - 32)
	expect(layout.left).toBeGreaterThanOrEqual(16)
	expect(layout.top).toBeGreaterThanOrEqual(16)
	expect(layout.needsScroll).toBe(true)
})
