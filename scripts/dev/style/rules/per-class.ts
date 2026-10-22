import { Array as Arr, Option, Result } from "effect"
import type { ClassRule, ExplainedClass, Theme } from "#scripts/dev/style/types.ts"

/** What a rule says about a class on its own. */
export type ClassSaying = Readonly<{ message: string; suggestion?: string }>

/** A class rule that judges each class of a list on its own. */
export const perClass =
	(check: (explained: ExplainedClass, theme: Theme) => Option.Option<ClassSaying>): ClassRule =>
	({ list, theme }) =>
		Arr.filterMap(list, (explained) =>
			Option.match(check(explained, theme), {
				onNone: () => Result.failVoid,
				onSome: (saying) => Result.succeed({ token: explained, ...saying })
			})
		)
