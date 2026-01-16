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

export function createContainer<C>(fn: (source: Schema<Empty>) => Schema<C>): C
export function createContainer<C, P = Empty>(
	fn: (source: Schema<P>) => Schema<C>,
	parent: P,
): C
export function createContainer(fn: (s: any) => any, parent?: any) {
	const cache: any = {}
	const proxy = new Proxy(fn({}), {
		get(target: any, prop) {
			if (prop in target) {
				if (typeof prop === 'string' && prop[0] === '$')
					return target[prop](proxy)
				if (prop in cache) return cache[prop]
				cache[prop] = target[prop](proxy)
				return cache[prop]
			}
			if (parent) return parent[prop]
			throw new Error(`Property ${String(prop)} not found`)
		},
	})
	return proxy
}
