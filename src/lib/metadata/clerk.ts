import * as errors from "@superbuilders/errors"
import { z } from "zod"

/**
 * Clerk User Public Metadata Schema
 *
 * This schema defines the structure of custom data stored in Clerk's user.publicMetadata.
 * Public metadata is visible to both your frontend and backend.
 *
 * Common use cases:
 * - User preferences (theme, language, timezone)
 * - Feature flags or subscription tiers
 * - Custom profile fields not provided by Clerk
 * - Application-specific user settings
 *
 * Example schema:
 * ```typescript
 * z.object({
 *   role: z.enum(["user", "admin"]).default("user"),
 *   preferences: z.object({
 *     theme: z.enum(["light", "dark"]).default("light"),
 *     language: z.string().default("en")
 *   }).default({}),
 *   onboardingCompleted: z.boolean().default(false)
 * })
 * ```
 *
 * Note: Clerk already stores common fields like firstName, lastName, email, etc.
 * Only add fields here that are specific to your application.
 */
export const ClerkUserPublicMetadataSchema = z
	.union([
		z.object({
			// Add your custom fields here
		}),
		z.undefined(),
		z.null()
	])
	.transform((val) => {
		if (val === undefined || val === null) {
			return {
				// Return default values for your fields
			}
		}
		return val
	})

export type ClerkUserPublicMetadata = z.infer<typeof ClerkUserPublicMetadataSchema>

/**
 * Parse and validate user public metadata from Clerk
 *
 * Usage:
 * ```typescript
 * import { currentUser } from "@clerk/nextjs/server"
 * import { parseUserPublicMetadata } from "@/lib/metadata/clerk"
 *
 * const user = await currentUser()
 * const metadata = parseUserPublicMetadata(user?.publicMetadata)
 * ```
 */
export function parseUserPublicMetadata(metadata: unknown): ClerkUserPublicMetadata {
	const result = ClerkUserPublicMetadataSchema.safeParse(metadata)
	if (!result.success) {
		throw errors.wrap(result.error, "invalid user metadata")
	}
	return result.data
}
