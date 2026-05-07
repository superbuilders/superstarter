// /stats — placeholder route. Dashboard plan §5 commit 4 +
// Dashboard PRD §4.3.
//
// Server component, no auth call (the (app)/layout.tsx gate runs
// once at the route-group level), no data fetching, no client
// interactivity. The Stats deep-dive is a follow-up PRD per Dashboard
// PRD §16 + §19; this page exists so the to-be-built TopNav's
// "Stats" link doesn't 404.

import Link from "next/link"

function Page() {
	return (
		<main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center gap-6 px-6 py-12">
			<header className="space-y-2">
				<h1 className="font-medium font-serif text-2xl text-text-1 tracking-tight">
					Stats
				</h1>
				<p className="text-sm text-text-2">
					Stats deep-dive is coming soon. After your first full sim there'll be more
					here.
				</p>
			</header>
			<Link
				href="/"
				className="text-cobalt text-sm hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-cobalt focus-visible:outline-offset-2"
			>
				Back to dashboard
			</Link>
		</main>
	)
}

export default Page
