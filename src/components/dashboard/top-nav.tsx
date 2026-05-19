"use client"

// <TopNav> — three-column header for the dashboard. Brand wordmark
// on the left, primary nav in the middle, streak chip + avatar on
// the right. Dashboard PRD §10.11 + `docs/plans/dashboard.md` §5
// commit 9 + `docs/plans/practice-round.md` §5 commit 1.

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
	userKey: string
}

function TopNav({ streakDays, initials, userKey }: TopNavProps) {
	const pathname = usePathname()
	const {
		prefs,
		tutorialSession,
		setTutorialEnabledForNextRun,
		setWarningSoundEnabled,
		clearTutorialSessionForLoginReset
	} = useFocusPrefs(userKey)

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
					const isActive = isHome ? pathname === "/" : pathname?.startsWith(item.href) === true
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
						<DropdownMenuCheckboxItem
							checked={tutorialSession.showOnNextRun}
							onCheckedChange={function onCheckedChange(checked) {
								setTutorialEnabledForNextRun(checked === true)
							}}
						>
							Show tutorial on next run
						</DropdownMenuCheckboxItem>
					</DropdownMenuContent>
				</DropdownMenu>
				<form action={signOutAction}>
					<button
						type="submit"
						onClick={function onClick() {
							clearTutorialSessionForLoginReset()
						}}
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
