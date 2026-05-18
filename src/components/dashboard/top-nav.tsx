"use client"

// <TopNav> — three-column header for the dashboard. Brand wordmark
// on the left, primary nav in the middle, streak chip + avatar on
// the right. Dashboard PRD §10.11 + `docs/plans/dashboard.md` §5
// commit 9 + `docs/plans/practice-round.md` §5 commit 1 (NAV rename
// "Practice" → "Practice Test", relink `/drill` → `/full-length/
// configure` per ask 1; the Mastery Map picker at /drill was deleted
// in this same commit because the dashboard's dojo cards are now
// the picker).
//
// "use client" because of usePathname() — active-route highlighting
// is the only client-side concern here. Next.js 16's usePathname
// .d.ts signature claims `string`, but at SSR the runtime returns
// `null` (the route segment isn't associated yet on the server tick
// before client hydration). Audit-against-actual-artifact at
// dashboard round commit 9 (per SPEC §6.14.18 + §6.14.23 — runtime
// verification, not static-trace) caught a TypeError on
// `pathname.startsWith` when the throwaway streaming render hit the
// server-side null path. Optional-chain `pathname?.startsWith(...)
// === true` tolerates the SSR-null case without fighting the .d.ts
// type. The active-class for "/" uses `pathname === "/"`; comparing
// null !== "/" yields false (correct inactive default during SSR).
//
// All five nav hrefs are static literals; <Link> works under
// next.config.ts's `typedRoutes: true` without the dynamic-href <a>
// reconciliation that dashboard round commits 7+8 applied for
// runtime-derived hrefs. The five routes resolve as:
//   - "/"                     → dashboard (commit 10 of the dashboard
//                                round mounted it; this round's commit 1
//                                deleted the /drill picker so the
//                                dashboard's dojo cards are the picker)
//   - "/full-length/configure" → full-length practice test configure
//                                (Phase 5 sub-phase 3); ask 1's relink
//                                target. "Practice Test" highlight
//                                applies on `/full-length/*` routes
//                                via `pathname?.startsWith("/full-length")`
//   - "/lessons"              → stub page (dashboard round commit 4)
//   - "/review"               → stub page (dashboard round commit 4)
//   - "/stats"                → stub page (dashboard round commit 4)
// All five resolve to a 200 by the time this nav renders.

import { LogOutIcon, Settings2Icon } from "lucide-react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { signOutAction } from "@/app/(app)/actions"
import { StreakChip } from "@/components/dashboard/streak-chip"
import { useFocusPrefs } from "@/components/focus-shell/focus-prefs"
import {
	DropdownMenu,
	DropdownMenuCheckboxItem,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuTrigger
} from "@/components/ui/dropdown-menu"

const NAV: ReadonlyArray<{
	href: "/" | "/full-length/configure" | "/lessons" | "/review" | "/stats"
	label: string
}> = [
	{ href: "/", label: "Dashboard" },
	{ href: "/full-length/configure", label: "Practice Test" },
	{ href: "/lessons", label: "Lessons" },
	{ href: "/review", label: "Review" },
	{ href: "/stats", label: "Stats" }
]

const ACTIVE_CLASS = "rounded-md bg-surface-2 px-[10px] py-[6px] font-medium text-[13px] text-text-1"
const INACTIVE_CLASS =
	"rounded-md px-[10px] py-[6px] text-[13px] text-text-2 transition-colors hover:bg-lavender"
const ICON_BUTTON_CLASS =
	"grid h-7 w-7 place-items-center rounded-full text-text-2 transition-colors duration-150 ease-out hover:bg-lavender hover:text-indigo focus-visible:outline focus-visible:outline-2 focus-visible:outline-cobalt focus-visible:outline-offset-1"

interface TopNavProps {
	streakDays: number
	initials: string
}

function TopNav({ streakDays, initials }: TopNavProps) {
	const pathname = usePathname()
	const { prefs, setWarningSoundEnabled, markTutorialReplayPending } = useFocusPrefs()
	return (
		<header className="mx-auto mb-2 flex max-w-[1100px] items-center justify-between border-border-soft border-b px-7 pt-[10px] pb-2">
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
				<DropdownMenu>
					<DropdownMenuTrigger asChild>
						<button
							type="button"
							aria-label="Settings"
							title="Settings"
							className={ICON_BUTTON_CLASS}
						>
							<Settings2Icon aria-hidden="true" className="h-[14px] w-[14px]" />
						</button>
					</DropdownMenuTrigger>
					<DropdownMenuContent align="end" className="w-56">
						<DropdownMenuLabel>Focus settings</DropdownMenuLabel>
						<DropdownMenuCheckboxItem
							checked={prefs.warningSoundEnabled}
							onCheckedChange={function onCheckedChange(checked) {
								setWarningSoundEnabled(checked === true)
							}}
						>
							Warning sound
						</DropdownMenuCheckboxItem>
						<DropdownMenuSeparator />
						<DropdownMenuItem
							onSelect={function onSelect() {
								markTutorialReplayPending()
							}}
						>
							Replay question tutorial
						</DropdownMenuItem>
					</DropdownMenuContent>
				</DropdownMenu>
				<form action={signOutAction}>
					<button
						type="submit"
						aria-label="Sign out"
						title="Sign out"
						className={ICON_BUTTON_CLASS}
					>
						<LogOutIcon aria-hidden="true" className="h-[14px] w-[14px]" />
					</button>
				</form>
			</div>
		</header>
	)
}

export type { TopNavProps }
export { TopNav }
