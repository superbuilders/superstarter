import type { ReactNode } from "react"

export type Profile = {
	email?: string
	phone: string | null
	children: ReactNode
}

export const greet = (name: string | undefined): string => String(name)

export const pick = (flag: boolean): string | null => (flag ? "yes" : null)

export const local = (): number => {
	const loose: string | null | undefined = undefined
	return loose === undefined ? 0 : 1
}
