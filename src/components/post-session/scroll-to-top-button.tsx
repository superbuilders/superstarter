"use client"

// <ScrollToTopButton> — floating action button anchored to the bottom-
// right of the viewport on the post-session review pages. Appears once
// the user has scrolled past ~one viewport, fades back out when they're
// already near the top. Clicking smooth-scrolls the page back to 0.

import { ArrowUpIcon } from "lucide-react"
import * as React from "react"
import { cn } from "@/lib/utils"

const VISIBILITY_THRESHOLD_PX = 400

function ScrollToTopButton() {
	const [visible, setVisible] = React.useState<boolean>(false)

	React.useEffect(function observeScroll() {
		function checkScroll() {
			setVisible(window.scrollY > VISIBILITY_THRESHOLD_PX)
		}
		checkScroll()
		window.addEventListener("scroll", checkScroll, { passive: true })
		return function cleanup() {
			window.removeEventListener("scroll", checkScroll)
		}
	}, [])

	const visibilityClass = visible
		? "opacity-100 translate-y-0 pointer-events-auto"
		: "opacity-0 translate-y-2 pointer-events-none"

	return (
		<button
			type="button"
			aria-label="Scroll to top"
			aria-hidden={!visible}
			tabIndex={visible ? 0 : -1}
			onClick={function scrollToTop() {
				window.scrollTo({ top: 0, behavior: "smooth" })
			}}
			data-testid="post-session-scroll-to-top"
			className={cn(
				"fixed right-5 bottom-5 z-40 flex h-11 w-11 items-center justify-center rounded-full border border-border-soft bg-surface text-cobalt shadow-md transition-all duration-200 ease-out hover:bg-lavender focus-visible:outline focus-visible:outline-2 focus-visible:outline-cobalt focus-visible:outline-offset-1",
				visibilityClass
			)}
		>
			<ArrowUpIcon aria-hidden="true" className="h-5 w-5" />
		</button>
	)
}

export { ScrollToTopButton }
