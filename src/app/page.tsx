"use client"

import { useInngestSubscription } from "@inngest/realtime/hooks"
import { fetchRealtimeSubscriptionToken, triggerHelloWorld } from "./actions"

export default function HomePage() {
	const { data, state } = useInngestSubscription({
		refreshToken: fetchRealtimeSubscriptionToken
	})

	return (
		<main className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-[#2e026d] to-[#15162c] text-white">
			<div className="container flex w-full max-w-4xl flex-col items-center justify-center gap-8 px-4 py-16">
				<div className="flex flex-col gap-2 text-center">
					<h1 className="font-extrabold text-5xl text-white tracking-tight sm:text-[5rem]">
						Inngest <span className="text-[hsl(280,100%,70%)]">Realtime</span>
					</h1>
					<p className="text-lg text-white/80">
						Click the button to trigger an Inngest function. The function will send a message back here in real-time.
					</p>
				</div>

				<button
					type="button"
					onClick={() => triggerHelloWorld()}
					className="rounded-full bg-white/10 px-10 py-3 font-semibold text-white no-underline transition hover:bg-white/20"
				>
					Trigger Inngest Function
				</button>

				<div className="mt-4 w-full rounded-xl bg-white/10 p-4">
					<div className="flex items-center justify-between">
						<h2 className="font-bold text-xl">Realtime Log Stream</h2>
						<div className="flex items-center gap-2">
							<span
								className={`h-3 w-3 rounded-full ${String(state).toLowerCase() === "connected" ? "bg-green-500" : "bg-yellow-500"}`}
							/>
							<span className="text-sm capitalize text-white/60">{String(state).toLowerCase()}</span>
						</div>
					</div>
					<div className="mt-4 h-64 w-full overflow-y-auto rounded-lg bg-black/30 p-4 font-mono text-sm">
						{data.length === 0 && <p className="text-white/40">Waiting for events...</p>}
						{data.map((message, index) => (
							<div key={`${message.kind === "data" ? message.createdAt.getTime() : index}`}>
								<span className="text-green-400">&gt; </span>
								<span>{message.kind === "data" ? message.data.message : `Stream ${message.kind}`}</span>
							</div>
						))}
					</div>
				</div>
			</div>
		</main>
	)
}
