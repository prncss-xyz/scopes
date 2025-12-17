import type { Prettify } from './types'

type Dep<P> = {
	[K in keyof P]: (o: never) => P[K]
}
export type Dependancies<P> = <O>(
	o: keyof P extends keyof O ? never : O,
) => Prettify<O & Dep<P>>

export function dependancy<Key extends PropertyKey, Value>(
	key: Key,
	value: Value,
) {
	return function <O>(
		o: Key extends keyof O ? never : O,
	): Prettify<O & Record<Key, Value>> {
		;(o as any)[key] = value
		return o as any
	}
}

type Empty = Record<never, unknown>
type Desc<O> = {
	[P in keyof O]: (o: O) => O[P]
}

export function inject<T>(
	fn: (s: Desc<Empty>) => Desc<T>,
): T {
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
