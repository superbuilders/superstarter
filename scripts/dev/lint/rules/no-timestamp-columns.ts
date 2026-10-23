import { Array as Arr } from "effect"
import * as ts from "typescript/unstable/ast"
import type { Visit } from "#scripts/dev/lint/types.ts"
import { packageOfSymbol } from "#scripts/dev/shared/packages.ts"

const BANNED_FACTORIES: ReadonlyArray<string> = ["timestamp", "date", "time", "interval"]

/**
 * Every primary key is a UUIDv7, whose first 48 bits are the row's creation time, so drizzle's timestamp, date,
 * time and interval column factories are banned outright. The callee is resolved through the checker to its
 * drizzle-orm export, so a renamed or namespace import cannot hide one.
 */
export const noTimestampColumns: Visit = ({ semantics }) => {
	const bannedFactoryOf = (callee: ts.Expression): string | undefined => {
		const symbol = semantics.symbolAt(callee)
		const resolved = symbol === undefined ? undefined : semantics.aliasTarget(symbol)
		if (resolved === undefined || packageOfSymbol(resolved) !== "drizzle-orm") {
			return undefined
		}
		return Arr.contains(BANNED_FACTORIES, resolved.name) ? resolved.name : undefined
	}

	return (node) => {
		const factory = ts.isCallExpression(node) ? bannedFactoryOf(node.expression) : undefined
		if (!ts.isCallExpression(node) || factory === undefined) {
			return []
		}
		return [
			{
				node: node.expression,
				message: `Drizzle column factory '${factory}(…)' is banned. Tables use UUIDv7 primary keys (uuid().default(sql\`uuidv7()\`)) and read creation time from the id with timestampFromUuidv7(). No exceptions.`,
				suggestion:
					"Drop the column. A separate event time is its own UUIDv7-keyed ledger row; a source or future time is unix milliseconds in a bigint named for its unit."
			}
		]
	}
}
