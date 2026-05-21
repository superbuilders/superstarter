import * as errors from "@superbuilders/errors"
import { adminEmails } from "@/config/admins"
import { auth } from "@/auth"
import { logger } from "@/logger"

const ErrUnauthorized = errors.new("unauthorized")

interface AdminContext {
	userId: string
	email: string
}

async function requireAdminEmail(): Promise<AdminContext> {
	const session = await auth()
	if (!session?.user?.email) {
		logger.warn("admin gate: no session")
		throw errors.wrap(ErrUnauthorized, "no session")
	}
	const email = session.user.email.toLowerCase()
	const allowed = adminEmails.some(function isAllowed(allowedEmail) {
		return allowedEmail.toLowerCase() === email
	})
	if (!allowed) {
		logger.warn({ email }, "admin gate: email not in allowlist")
		throw errors.wrap(ErrUnauthorized, "email not in admin allowlist")
	}
	const userId = session.user.id
	if (!userId) {
		logger.error({ email }, "admin gate: session missing user id")
		throw errors.wrap(ErrUnauthorized, "session missing user id")
	}
	return { userId, email }
}

export type { AdminContext }
export { ErrUnauthorized, requireAdminEmail }
