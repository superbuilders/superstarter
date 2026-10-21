type Pair = readonly [string, number]

type Lookup = ReadonlyMap<string, number>

type Point = Readonly<{ x: number; y: number }>

export const describe = (pair: Pair, lookup: Lookup, point: Point): number =>
	pair[1] + lookup.size + point.x
