import NextAuth from "next-auth"
import Google from "next-auth/providers/google"
import { bigintAdapter } from "@/auth/drizzle-adapter-shim"
import { db } from "@/db"
import { env } from "@/env"

const adapter = bigintAdapter(db)

const { handlers, auth, signIn, signOut } = NextAuth({
	adapter,
	providers: [
		Google({ clientId: env.AUTH_GOOGLE_ID, clientSecret: env.AUTH_GOOGLE_SECRET })
	],
	session: { strategy: "database" },
	secret: env.AUTH_SECRET
})

export { auth, handlers, signIn, signOut }
