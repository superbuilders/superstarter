import { signIn } from "@/auth"
import { Button } from "@/components/ui/button"

async function signInWithGoogle() {
	"use server"
	await signIn("google", { redirectTo: "/" })
}

function LoginPage() {
	return (
		<main className="flex min-h-dvh items-center justify-center px-6">
			<div className="w-full max-w-sm space-y-6">
				<header className="space-y-1">
					<h1 className="font-semibold text-xl tracking-tight">18 Seconds</h1>
					<p className="text-muted-foreground text-sm">Sign in to start practicing.</p>
				</header>
				<form action={signInWithGoogle}>
					<Button type="submit" className="w-full">
						Continue with Google
					</Button>
				</form>
			</div>
		</main>
	)
}

export default LoginPage
