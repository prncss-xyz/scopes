export function noop() {}

export function id<T>(t: T) {
	return t
}

export function exhaustive(x: never): never {
	throw new Error(`unexpected value: ${x}`)
}
