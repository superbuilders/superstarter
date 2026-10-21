import { Context, Data, Schema as S } from "effect"

export class Renamed extends S.TaggedError<Renamed, { readonly brand: unique symbol }>()("Renamed", {}) {}

export class Gone extends Data.TaggedError("Gone")<Readonly<{ id: string }>> {}

export class Clock extends Context.Service<Clock, Readonly<{ now: number }>>()("fixtures/Clock") {}
