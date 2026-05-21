import type { Difficulty, SubTypeId } from "@/config/sub-types"
import type { ItemBody } from "@/server/items/body-schema"

interface SeedItemInput {
	subTypeId: SubTypeId
	difficulty: Difficulty
	body: ItemBody
	options: { text: string }[]
	correctAnswerIndex: number
	explanation?: string
	strategyId?: string
}

export type { SeedItemInput }
