"use client"

// Client component that renders the lessons index grid and decorates
// each card with a persistent "Mastered ✅" badge sourced from
// localStorage. The page-level <ul>/<Link> markup must live in a client
// component because we read `localStorage` on mount to know which
// slugs the user has already cleared.
//
// Server <Page> stays a server component for the chrome/auth gates;
// it just hands the (static) lesson definitions over to this client
// island.

import type { Route } from "next"
import Link from "next/link"
import * as React from "react"
import { getMasteredSlugs } from "@/components/lessons/shared/lesson-mastery-store"

interface LessonCard {
	href: Route
	slug: string
	eyebrow: string
	title: string
	blurb: string
	shortcut: string
	eyebrowClass: string
}

interface LessonsGridProps {
	lessons: ReadonlyArray<LessonCard>
}

function LessonsGrid({ lessons }: LessonsGridProps) {
	const [masteredSlugs, setMasteredSlugs] = React.useState<ReadonlySet<string>>(new Set())
	React.useEffect(function load() {
		setMasteredSlugs(getMasteredSlugs())
	}, [])
	return (
		<ul className="grid gap-3 sm:grid-cols-2">
			{lessons.map(function renderCard(lesson) {
				const mastered = masteredSlugs.has(lesson.slug)
				const cardTone = mastered
					? "border-good bg-good/5 hover:bg-good/10"
					: "border-border-soft bg-surface hover:bg-lavender"
				const eyebrowTone = mastered ? "text-good" : lesson.eyebrowClass
				const eyebrowText = mastered ? "Mastered ✅" : lesson.eyebrow
				return (
					<li key={lesson.href}>
						<Link
							href={lesson.href}
							className={`group relative flex h-full flex-col gap-3 rounded-lg border px-5 py-5 transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-cobalt focus-visible:outline-offset-2 ${cardTone}`}
						>
							<div className="flex items-center justify-between">
								<span
									className={`font-semibold text-[11px] uppercase tracking-[0.06em] ${eyebrowTone}`}
								>
									{eyebrowText}
								</span>
								<span
									aria-hidden="true"
									className="font-mono text-text-3 text-xs transition-transform group-hover:translate-x-0.5"
								>
									→
								</span>
							</div>
							<h2 className="font-medium font-serif text-[20px] text-text-1 leading-tight tracking-[-0.005em]">
								{lesson.title}
							</h2>
							<p className="text-[13px] text-text-2 leading-snug">{lesson.blurb}</p>
							<p className="mt-auto font-mono text-[11px] text-text-3 tracking-[0.01em]">
								{lesson.shortcut}
							</p>
						</Link>
					</li>
				)
			})}
		</ul>
	)
}

export type { LessonCard, LessonsGridProps }
export { LessonsGrid }
