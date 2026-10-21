type Maybe<T> = T | null

export type Profile = {
	email?: string | null // violation
	phone: string | null | undefined // violation
	nickname?: Maybe<string> // violation
}

export const greet = (name: string | null | undefined): string => String(name) // violation

export const defaulted = (limit: number | null = 3): string => String(limit) // violation

export const pick = (flag: boolean) => (flag ? null : undefined) // violation
