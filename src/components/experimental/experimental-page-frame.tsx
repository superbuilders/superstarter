import * as React from "react"
import { PageNav } from "@/components/nav/page-nav"
import { ExperimentalSubnav } from "@/components/experimental/experimental-subnav"
import type { NavChrome } from "@/server/nav/chrome"

interface ExperimentalPageFrameProps {
	chromePromise: Promise<NavChrome>
	title: string
	description: string
	eyebrow?: string
	children: React.ReactNode
}

function ExperimentalPageFrame(props: ExperimentalPageFrameProps) {
	return (
		<div className="min-h-screen bg-bg text-text-1">
			<React.Suspense fallback={null}>
				<PageNav chromePromise={props.chromePromise} />
			</React.Suspense>
			<main className="mx-auto max-w-[1100px] px-7 pb-12">
				<header className="mb-4 flex flex-col gap-1 border-border-soft border-b pt-6 pb-4">
					{props.eyebrow ? (
						<p className="font-semibold text-[11px] text-cobalt uppercase tracking-[0.06em]">
							{props.eyebrow}
						</p>
					) : null}
					<h1 className="font-medium font-serif text-2xl text-text-1 tracking-tight">
						{props.title}
					</h1>
					<p className="max-w-[68ch] text-sm text-text-2">{props.description}</p>
				</header>
				<ExperimentalSubnav />
				{props.children}
			</main>
		</div>
	)
}

export { ExperimentalPageFrame }
