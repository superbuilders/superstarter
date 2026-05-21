import { redirect } from "next/navigation"
import { auth } from "@/auth"

async function loadExperimentalUserId(): Promise<string> {
	const session = await auth()
	if (!session?.user?.id) {
		redirect("/login")
	}
	return session.user.id
}

export { loadExperimentalUserId }
