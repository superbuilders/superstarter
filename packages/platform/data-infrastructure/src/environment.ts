import { Schema } from "effect"

/**
 * Superstarter's environments. The Alchemy stage is exactly one of these: Alchemy keeps each stage's
 * state apart, and every physical name derives from it. Adding an environment means adding it here
 * and adding its composition under `src/compose/`.
 */
const ENVIRONMENTS = ["production"] as const
export const Environment = Schema.Literals(ENVIRONMENTS)
export type Environment = typeof Environment.Type

export const PROJECT = "superstarter"
