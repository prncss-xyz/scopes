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

export function inject<T>(fn: (s: Desc<Empty>) => Desc<T>): T
export function inject<T, S extends Empty>(fn: (s: Desc<S>) => Desc<T>, s: S): T
export function inject<T, S extends Empty = Empty>(
	fn: (s: Desc<S>) => Desc<T>,
	s?: S,
): T {
	const s_ = s || {}
	const cache: any = {}
	const p = new Proxy(fn({} as any), {
		get(target: any, prop) {
			if (prop in s_) return (s as any)[prop]
			if (prop in cache) return cache[prop]
			cache[prop] = target[prop](p)
			return cache[prop]
		},
		has(target: any, prop) {
			return prop in s_ || prop in target
		},
		getOwnPropertyDescriptor() {
			return {
				enumerable: true,
				configurable: true,
			}
		},
		ownKeys(target: any) {
			const sk = Object.keys(s_)
			const st = Object.keys(target)
			return [...sk, ...st]
		},
	})
	return p
}
