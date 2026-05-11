// Shared chrome for every lesson page: bordered header with eyebrow,
// title, blurb, back link to /lessons. Each lesson route mounts this
// once at the top of its body so the chrome stays consistent across
// the four interactive surfaces.

import Link from "next/link"
import type * as React from "react"

interface LessonShellProps {
	eyebrow: string
	eyebrowClass?: string
	title: string
	blurb: string
	children: React.ReactNode
}

function LessonShell({
	eyebrow,
	eyebrowClass = "text-cobalt",
	title,
	blurb,
	children
}: LessonShellProps) {
	return (
		<main className="mx-auto max-w-[1100px] px-7 pb-16">
			<header className="mb-6 flex flex-col gap-1 border-border-soft border-b pt-6 pb-4">
				<div className="flex items-center justify-between">
					<p className={`font-semibold text-[11px] uppercase tracking-[0.06em] ${eyebrowClass}`}>
						{eyebrow}
					</p>
					<Link
						href="/lessons"
						className="text-text-3 text-xs hover:text-cobalt hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-cobalt focus-visible:outline-offset-2"
					>
						← All lessons
					</Link>
				</div>
				<h1 className="font-medium font-serif text-2xl text-text-1 tracking-tight">{title}</h1>
				<p className="max-w-[60ch] text-sm text-text-2">{blurb}</p>
			</header>
			{children}
		</main>
	)
}

export type { LessonShellProps }
export { LessonShell }
