// Round 2 commit 2 audit step (e) + (f) — WCAG contrast verification for
// Layer-A retrofit candidate values. Uses standard OKLCH → linear sRGB →
// WCAG relative luminance pipeline.
//
// Run: bun scripts/_logs/round-2-retrofit-screenshots/contrast-check.ts

interface OKLCH {
	l: number
	c: number
	h: number
}

function oklchToLinearSRGB(oklch: OKLCH): { r: number; g: number; b: number } {
	const lp = oklch.l + 0.3963377774 * oklch.c * Math.cos((oklch.h * Math.PI) / 180) + 0.2158037573 * oklch.c * Math.sin((oklch.h * Math.PI) / 180)
	const mp = oklch.l - 0.1055613458 * oklch.c * Math.cos((oklch.h * Math.PI) / 180) - 0.0638541728 * oklch.c * Math.sin((oklch.h * Math.PI) / 180)
	const sp = oklch.l - 0.0894841775 * oklch.c * Math.cos((oklch.h * Math.PI) / 180) - 1.291485548 * oklch.c * Math.sin((oklch.h * Math.PI) / 180)
	const lin_l = lp ** 3
	const lin_m = mp ** 3
	const lin_s = sp ** 3
	const r = 4.0767416621 * lin_l - 3.3077115913 * lin_m + 0.2309699292 * lin_s
	const g = -1.2684380046 * lin_l + 2.6097574011 * lin_m - 0.3413193965 * lin_s
	const b = -0.0041960863 * lin_l - 0.7034186147 * lin_m + 1.707614701 * lin_s
	return { r, g, b }
}

function relativeLuminance(linRGB: { r: number; g: number; b: number }): number {
	const r = Math.max(0, Math.min(1, linRGB.r))
	const g = Math.max(0, Math.min(1, linRGB.g))
	const b = Math.max(0, Math.min(1, linRGB.b))
	return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

function contrastRatio(c1: OKLCH, c2: OKLCH): number {
	const l1 = relativeLuminance(oklchToLinearSRGB(c1))
	const l2 = relativeLuminance(oklchToLinearSRGB(c2))
	const [hi, lo] = l1 > l2 ? [l1, l2] : [l2, l1]
	return (hi + 0.05) / (lo + 0.05)
}

function fmt(c: OKLCH): string {
	return `oklch(${c.l} ${c.c} ${c.h})`
}

function row(label: string, fg: OKLCH, bg: OKLCH, target: number): void {
	const ratio = contrastRatio(fg, bg)
	const pass = ratio >= target ? "✓" : "✗"
	process.stdout.write(`${pass} ${label.padEnd(50)} ${fmt(fg).padEnd(28)} on ${fmt(bg).padEnd(28)} = ${ratio.toFixed(2)}:1 (need ≥${target})\n`)
}

process.stdout.write("=== Pre-retrofit (current globals.css) ===\n")
process.stdout.write("--- Light mode ---\n")
row("foreground vs background", { l: 0.145, c: 0, h: 0 }, { l: 1, c: 0, h: 0 }, 4.5)
row("muted-foreground vs background", { l: 0.556, c: 0, h: 0 }, { l: 1, c: 0, h: 0 }, 4.5)
row("muted-foreground vs muted", { l: 0.556, c: 0, h: 0 }, { l: 0.97, c: 0, h: 0 }, 4.5)
row("border vs background (3:1 non-text)", { l: 0.922, c: 0, h: 0 }, { l: 1, c: 0, h: 0 }, 3)
process.stdout.write("--- Dark mode ---\n")
row("foreground vs background", { l: 0.985, c: 0, h: 0 }, { l: 0.145, c: 0, h: 0 }, 4.5)
row("muted-foreground vs background", { l: 0.708, c: 0, h: 0 }, { l: 0.145, c: 0, h: 0 }, 4.5)
row("muted-foreground vs muted", { l: 0.708, c: 0, h: 0 }, { l: 0.269, c: 0, h: 0 }, 4.5)

process.stdout.write("\n=== Post-retrofit (proposed Layer-A targets — hue 270, chroma 0.005-0.012) ===\n")
process.stdout.write("--- Light mode ---\n")
row("foreground vs background", { l: 0.145, c: 0.012, h: 270 }, { l: 0.99, c: 0.005, h: 270 }, 4.5)
row("muted-foreground vs background (target 0.45)", { l: 0.45, c: 0.012, h: 270 }, { l: 0.99, c: 0.005, h: 270 }, 4.5)
row("muted-foreground vs muted (target 0.45)", { l: 0.45, c: 0.012, h: 270 }, { l: 0.97, c: 0.008, h: 270 }, 4.5)
row("muted-foreground alt 0.50 vs background", { l: 0.5, c: 0.012, h: 270 }, { l: 0.99, c: 0.005, h: 270 }, 4.5)
row("muted-foreground alt 0.50 vs muted", { l: 0.5, c: 0.012, h: 270 }, { l: 0.97, c: 0.008, h: 270 }, 4.5)
row("border vs background (non-text 3:1)", { l: 0.92, c: 0.008, h: 270 }, { l: 0.99, c: 0.005, h: 270 }, 3)
row("primary-foreground vs primary (button)", { l: 0.985, c: 0.005, h: 270 }, { l: 0.205, c: 0.012, h: 270 }, 4.5)
process.stdout.write("--- Dark mode ---\n")
row("foreground vs background", { l: 0.985, c: 0.005, h: 270 }, { l: 0.145, c: 0.012, h: 270 }, 4.5)
row("muted-foreground vs background (preserve 0.708)", { l: 0.708, c: 0.012, h: 270 }, { l: 0.145, c: 0.012, h: 270 }, 4.5)
row("muted-foreground vs muted (preserve 0.708)", { l: 0.708, c: 0.012, h: 270 }, { l: 0.269, c: 0.012, h: 270 }, 4.5)
row("primary-foreground vs primary (button)", { l: 0.205, c: 0.012, h: 270 }, { l: 0.87, c: 0.012, h: 270 }, 4.5)

process.stdout.write("\n=== Sanity: destructive vs background (button-grade, AA ≥ 3:1 for non-text component) ===\n")
row("destructive light vs background light", { l: 0.577, c: 0.245, h: 27 }, { l: 0.99, c: 0.005, h: 270 }, 3)
row("destructive dark vs background dark", { l: 0.704, c: 0.191, h: 22 }, { l: 0.145, c: 0.012, h: 270 }, 3)
