// Canonical Zod schema for `items.body`.
//
// v1 is text-only, so the union has exactly one variant today. We still wrap
// it in `z.discriminatedUnion("kind", [...])` because future visual sub-types
// (text_with_image, chart, grid, image_pair, image_pair_grid, column_matching)
// land as additional variants — additive, not a schema rewrite. The renderer
// dispatches via `switch (body.kind)` with TypeScript exhaustiveness checking
// so adding a variant fails the compile until every consumer handles it.
// See SPEC §3.3.1 and design_decisions.md §1.2.
import { z } from "zod"

const bodyText = z.object({
	kind: z.literal("text"),
	text: z.string().min(1)
})

const itemBody = z.discriminatedUnion("kind", [bodyText])

type ItemBody = z.infer<typeof itemBody>

export type { ItemBody }
export { bodyText, itemBody }
