interface StageTag {
	readonly Key: string
	readonly Value: string
}

interface ModuleContext {
	readonly region: "us-east-1"
	readonly stage: string
	readonly resourcePrefix: string
	readonly accountId: string
	readonly tags: StageTag[]
}

export type { ModuleContext, StageTag }
