export class Store { // violation
	readonly items: ReadonlyArray<string> = []
}

const Fake = { TaggedError: () => class {} } // violation

export class Impostor extends Fake.TaggedError() {} // violation
