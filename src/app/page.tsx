"use client"

import { useInngestSubscription } from "@inngest/realtime/hooks"
import { fetchRealtimeSubscriptionToken, triggerHelloWorld } from "./actions"

export default function HomePage() {
	const { data, latestData, error, state } = useInngestSubscription({
		refreshToken: fetchRealtimeSubscriptionToken
	})

	const getStatusIndicator = () => {
		if (error) return { color: "bg-red-500", text: "error" }

		const stateStr = String(state).toLowerCase()
		switch (stateStr) {
			case "active":
				return { color: "bg-green-500", text: "active" }
			case "closed":
			case "error":
				return { color: "bg-red-500", text: stateStr }
			case "connecting":
			case "refresh_token":
				return { color: "bg-yellow-500", text: stateStr === "refresh_token" ? "refreshing token" : "connecting" }
			case "closing":
				return { color: "bg-orange-500", text: "closing" }
			default:
				return { color: "bg-gray-500", text: stateStr }
		}
	}

	const statusIndicator = getStatusIndicator()

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
							<span className={`h-3 w-3 rounded-full ${statusIndicator.color}`} />
							<span className="text-sm capitalize text-white/60">{statusIndicator.text}</span>
						</div>
					</div>

					{error && (
						<div className="mt-2 rounded-lg bg-red-500/20 p-3 border border-red-500/30">
							<p className="text-red-200 text-sm">Connection error: {error.message}</p>
						</div>
					)}

					{latestData && (
						<div className="mt-2 rounded-lg bg-blue-500/20 p-3 border border-blue-500/30">
							<p className="text-blue-200 text-sm">
								Latest: {latestData.kind === "data" ? latestData.data.message : `Stream ${latestData.kind}`}
							</p>
						</div>
					)}

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
