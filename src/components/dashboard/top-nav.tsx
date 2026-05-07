"use client"

// <TopNav> — three-column header for the dashboard. Brand wordmark
// on the left, primary nav in the middle, streak chip + avatar on
// the right. Dashboard PRD §10.11 + `docs/plans/dashboard.md` §5
// commit 9.
//
// "use client" because of usePathname() — active-route highlighting
// is the only client-side concern here. Next.js 16's usePathname
// .d.ts signature claims `string`, but at SSR the runtime returns
// `null` (the route segment isn't associated yet on the server tick
// before client hydration). Audit-against-actual-artifact at
// commit 9 (per SPEC §6.14.18 + §6.14.23 — runtime verification,
// not static-trace) caught a TypeError on `pathname.startsWith` when
// the throwaway streaming render hit the server-side null path.
// Optional-chain `pathname?.startsWith(...) === true` matches PRD
// §10.11's verbatim shape and tolerates the SSR-null case without
// fighting the .d.ts type. The active-class for "/" uses
// `pathname === "/"`; comparing null !== "/" yields false (correct
// inactive default during SSR).
//
// All five nav hrefs are static literals; <Link> works under
// next.config.ts's `typedRoutes: true` without the dynamic-href <a>
// reconciliation that commits 7+8 applied for runtime-derived
// hrefs. The five routes were established earlier in the round:
//   - "/"        → dashboard (commit 10 mounts; commits 3-9 still
//                 render the Mastery Map, which migrated to /drill
//                 at commit 3)
//   - "/drill"   → Mastery Map sub-type picker (commit 3)
//   - "/lessons" → stub page (commit 4)
//   - "/review"  → stub page (commit 4)
//   - "/stats"   → stub page (commit 4)
// All five resolve to a 200 by the time this nav renders.

import Link from "next/link"
import { usePathname } from "next/navigation"
import { StreakChip } from "@/components/dashboard/streak-chip"

const NAV: ReadonlyArray<{ href: "/" | "/drill" | "/lessons" | "/review" | "/stats"; label: string }> = [
	{ href: "/", label: "Dashboard" },
	{ href: "/drill", label: "Practice" },
	{ href: "/lessons", label: "Lessons" },
	{ href: "/review", label: "Review" },
	{ href: "/stats", label: "Stats" }
]

const ACTIVE_CLASS = "rounded-md bg-surface-2 px-[10px] py-[6px] font-medium text-[13px] text-text-1"
const INACTIVE_CLASS =
	"rounded-md px-[10px] py-[6px] text-[13px] text-text-2 transition-colors hover:bg-lavender"

interface TopNavProps {
	streakDays: number
	initials: string
}

function TopNav({ streakDays, initials }: TopNavProps) {
	const pathname = usePathname()
	return (
		<header className="mx-auto mb-5 flex max-w-[1100px] items-center justify-between border-border-soft border-b px-7 pt-4 pb-[14px]">
			<Link
				href="/"
				className="font-medium font-serif text-[18px] text-indigo tracking-[-0.01em]"
			>
				18seconds
			</Link>
			<nav className="flex gap-[2px]">
				{NAV.map(function renderNavItem(item) {
					const isHome = item.href === "/"
					const isActive = isHome
						? pathname === "/"
						: pathname?.startsWith(item.href) === true
					const className = isActive ? ACTIVE_CLASS : INACTIVE_CLASS
					return (
						<Link key={item.href} href={item.href} className={className}>
							{item.label}
						</Link>
					)
				})}
			</nav>
			<div className="flex items-center gap-[10px]">
				<StreakChip streakDays={streakDays} />
				<span
					aria-label="account"
					role="img"
					className="grid h-7 w-7 place-items-center rounded-full bg-lavender font-medium text-[11px] text-indigo"
				>
					{initials}
				</span>
			</div>
		</header>
	)
}

export type { TopNavProps }
export { TopNav }
