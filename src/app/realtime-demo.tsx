"use client"

import type { Realtime } from "@inngest/realtime"
import { useInngestSubscription } from "@inngest/realtime/hooks"
import * as React from "react"
import { getRealtimeToken, triggerHello } from "@/app/actions"
import { Button } from "@/components/ui/button"

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
			<Button onClick={handleTrigger} disabled={isPending}>
				{buttonLabel}
			</Button>
			{channelId && (
				<div className="flex flex-col items-center gap-2">
					<p className="text-muted-foreground text-sm">Channel: demo:{channelId}</p>
					<div className="flex items-center gap-2">
						<span className="text-muted-foreground">Status:</span>
						<span className="font-bold font-mono text-foreground">{statusLabel}</span>
					</div>
				</div>
			)}
		</div>
	)
}

export { RealtimeDemo }
