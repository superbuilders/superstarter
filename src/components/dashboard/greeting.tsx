"use client"

import * as React from "react"

interface GreetingProps {
	firstName: string
	headline: string
}

// Hour ranges (user-local):
//   5–11  → "Good morning"
//   12–16 → "Good afternoon"
//   17–20 → "Good evening"
//   21–4  → "Burning the midnight oil"
//
// Initial SSR pass renders "Hello" to avoid hydration mismatch — the
// user's local hour is unknown server-side. On mount the effect swaps
// in the correct phrase. A one-frame flash of "Hello, {firstName}" on
// first paint is acceptable and far less jarring than a hydration
// warning.
function timeOfDayGreeting(hour: number): string {
	if (hour >= 5 && hour <= 11) return "Good morning"
	if (hour >= 12 && hour <= 16) return "Good afternoon"
	if (hour >= 17 && hour <= 20) return "Good evening"
	return "Burning the midnight oil"
}

function Greeting({ firstName, headline }: GreetingProps) {
	const [hour, setHour] = React.useState<number | undefined>(undefined)
	React.useEffect(function readLocalHour() {
		setHour(new Date().getHours())
	}, [])
	const greeting = hour === undefined ? "Hello" : timeOfDayGreeting(hour)
	return (
		<h2 className="font-medium font-serif text-[22px] text-text-1 leading-[1.15] tracking-[-0.015em]">
			{greeting}, {firstName}.{" "}
			<em className="font-normal text-cobalt italic">{headline}</em>
		</h2>
	)
}

export type { GreetingProps }
export { Greeting, timeOfDayGreeting }
