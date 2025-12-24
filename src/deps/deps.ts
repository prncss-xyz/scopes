import type { Prettify } from '../types'

export type Empty = Record<never, unknown>
type Schema<O> = {
	[K in keyof O]: (o: O) => O[K]
}
type AnySchema<O> = {
	[K in keyof O]: (o: never) => O[K]
}

export type Dependancies<Shape> = <O>(
	o: keyof Shape extends keyof O ? never : O,
) => Prettify<O & AnySchema<Shape>>

export function dependancy<Key extends PropertyKey, Value>(
	key: Key,
	value: Value,
) {
	return function <O>(
		o: Key extends keyof O ? never : O,
	): Prettify<O & Record<Key, Value>> {
		return { ...o, [key]: value } as any
	}
}

export function inject<T>(fn: (s: Schema<Empty>) => Schema<T>): T {
	const cache: any = {}
	const proxy = new Proxy(fn({} as any), {
		get(target: any, prop) {
			if (prop in cache) return cache[prop]
			cache[prop] = target[prop](proxy)
			return cache[prop]
		},
	})
	return proxy
}
