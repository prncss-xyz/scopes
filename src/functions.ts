export function noop() {}

export function id<T>(t: T) {
	return t
}

export function exhaustive(x: never): never {
	throw new Error(`unexpected value: ${x}`)
}

export type AnyFunction = (...args: any[]) => any
export function isFunction(u: unknown): u is AnyFunction {
	return typeof u === 'function'
}

export type Init<T> = T | (() => T)
export function fromInit<T>(init: Init<T>): T {
	return isFunction(init) ? init() : init
}
export type SetState<T> = T | ((last: T) => T)
export function setState<T>(next: SetState<T>, last: T): T {
	return isFunction(next) ? next(last) : next
}
