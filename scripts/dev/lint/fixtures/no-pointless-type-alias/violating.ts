type Name = string // violation

type Flag = true // violation

interface Shape {
	readonly kind: string
}

type Alias = Shape // violation

export const describe = (name: Name, flag: Flag, shape: Alias): string => `${name} ${String(flag)} ${shape.kind}`
