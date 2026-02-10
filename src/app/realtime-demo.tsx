"use client"

import type { Realtime } from "@inngest/realtime"
import { useInngestSubscription } from "@inngest/realtime/hooks"
import * as React from "react"
import { getRealtimeToken, triggerHello } from "@/app/actions"

function RealtimeDemo() {
	const [channelId, setChannelId] = React.useState<string | null>(null)
	const [isPending, startTransition] = React.useTransition()

	const refreshToken = React.useCallback(async (): Promise<Realtime.Subscribe.Token | null> => {
		if (!channelId) {
			return null
		}
		return getRealtimeToken(`demo:${channelId}`)
	}, [channelId])

	const { latestData } = useInngestSubscription({
		enabled: Boolean(channelId),
		refreshToken
	})

	const status = latestData?.data?.status
	const buttonLabel = isPending ? "Triggering..." : "Trigger Inngest Function"
	const statusLabel = status ? String(status) : "waiting..."

	function handleTrigger() {
		const id = Date.now().toString()
		setChannelId(id)
		startTransition(async () => {
			await triggerHello(id)
		})
	}

	return (
		<div className="flex flex-col items-center gap-6">
			<button
				type="button"
				onClick={handleTrigger}
				disabled={isPending}
				className="rounded-lg bg-[hsl(280,100%,70%)] px-6 py-3 font-bold text-white transition hover:bg-[hsl(280,100%,60%)] disabled:opacity-50"
			>
				{buttonLabel}
			</button>
			{channelId && (
				<div className="flex flex-col items-center gap-2">
					<p className="text-sm text-white/60">Channel: demo:{channelId}</p>
					<div className="flex items-center gap-2">
						<span className="text-white/80">Status:</span>
						<span className="font-bold font-mono text-[hsl(280,100%,70%)]">{statusLabel}</span>
					</div>
				</div>
			)}
		</div>
	)
}

export { RealtimeDemo }
