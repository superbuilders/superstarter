import { RealtimeDemo } from "@/app/realtime-demo"

function HomePage() {
	return (
		<main className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-[#2e026d] to-[#15162c] text-white">
			<div className="container flex flex-col items-center justify-center gap-12 px-4 py-16">
				<h1 className="font-extrabold text-5xl text-white tracking-tight sm:text-[5rem]">
					<span className="text-[hsl(280,100%,70%)]">Inngest</span> Realtime
				</h1>
				<p className="max-w-md text-center text-lg text-white/80">
					Click the button below to trigger an Inngest function and watch the status update in
					real-time.
				</p>
				<RealtimeDemo />
			</div>
		</main>
	)
}

export default HomePage
