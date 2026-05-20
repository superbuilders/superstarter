"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"

const ITEMS: ReadonlyArray<{ href: "/experimental/practice-test" | "/experimental/drills" | "/experimental/review"; label: string }> = [
	{ href: "/experimental/practice-test", label: "Practice Test" },
	{ href: "/experimental/drills", label: "Drills" },
	{ href: "/experimental/review", label: "Review" }
]

const ACTIVE_CLASS = "rounded-md bg-surface-2 px-[10px] py-[6px] font-medium text-[13px] text-text-1"
const INACTIVE_CLASS =
	"rounded-md px-[10px] py-[6px] text-[13px] text-text-2 transition-colors hover:bg-lavender"

function ExperimentalSubnav() {
	const pathname = usePathname()
	return (
		<nav className="mb-6 flex flex-wrap gap-[2px]" aria-label="Experimental sections">
			{ITEMS.map(function renderItem(item) {
				const isActive = pathname?.startsWith(item.href) === true
				return (
					<Link
						key={item.href}
						href={{ pathname: item.href }}
						className={isActive ? ACTIVE_CLASS : INACTIVE_CLASS}
					>
						{item.label}
					</Link>
				)
			})}
		</nav>
	)
}

export { ExperimentalSubnav }
