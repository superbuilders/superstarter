import { expect, test } from "bun:test"
import { timeOfDayGreeting } from "@/components/dashboard/greeting"

// Hour ranges:
//   5–11  → Good morning
//   12–16 → Good afternoon
//   17–20 → Good evening
//   21–4  → Burning the midnight oil

test("greeting: 5am is the first 'Good morning' hour", () => {
	expect(timeOfDayGreeting(5)).toBe("Good morning")
})

test("greeting: 8am is morning", () => {
	expect(timeOfDayGreeting(8)).toBe("Good morning")
})

test("greeting: 11am is the last morning hour", () => {
	expect(timeOfDayGreeting(11)).toBe("Good morning")
})

test("greeting: noon (12) flips to afternoon", () => {
	expect(timeOfDayGreeting(12)).toBe("Good afternoon")
})

test("greeting: 3pm (15) is afternoon", () => {
	expect(timeOfDayGreeting(15)).toBe("Good afternoon")
})

test("greeting: 4pm (16) is the last afternoon hour", () => {
	expect(timeOfDayGreeting(16)).toBe("Good afternoon")
})

test("greeting: 5pm (17) flips to evening", () => {
	expect(timeOfDayGreeting(17)).toBe("Good evening")
})

test("greeting: 8pm (20) is the last evening hour", () => {
	expect(timeOfDayGreeting(20)).toBe("Good evening")
})

test("greeting: 9pm (21) is night → midnight oil", () => {
	expect(timeOfDayGreeting(21)).toBe("Burning the midnight oil")
})

test("greeting: midnight (0) is night → midnight oil", () => {
	expect(timeOfDayGreeting(0)).toBe("Burning the midnight oil")
})

test("greeting: 4am is the last night hour → midnight oil", () => {
	expect(timeOfDayGreeting(4)).toBe("Burning the midnight oil")
})

test("greeting: 2am is night → midnight oil", () => {
	expect(timeOfDayGreeting(2)).toBe("Burning the midnight oil")
})
