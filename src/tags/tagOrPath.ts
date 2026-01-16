import { tag } from './tag'
import { type AnyTag, TYPE, PAYLOAD } from './types'

type PathFromTag<I extends AnyTag> = PathFromTagOpt<I> | PathFromTagRec<I>
type PathFromTagOpt<I extends AnyTag> = I extends {
	[TYPE]: infer T
	[PAYLOAD]?: unknown
}
	? undefined extends I['payload']
		? [T]
		: never
	: never
type PathFromTagRec<I> = I extends { [TYPE]: infer T; [PAYLOAD]?: infer P }
	? [T, ...PathFromTagRec<P>]
	: [I]

if (import.meta.vitest) {
	const { test, expectTypeOf } = import.meta.vitest
	test('one', () => {
		type Q = PathFromTag<{ type: 'a'; payload?: undefined }>
		expectTypeOf<Q>().toEqualTypeOf<['a'] | ['a', undefined]>()
	})
	test('two', () => {
		type Q = PathFromTag<{ type: 'a'; payload: string }>
		expectTypeOf<Q>().toEqualTypeOf<['a', string]>()
	})
	test('two, optional', () => {
		type Q = PathFromTag<{ type: 'a'; payload?: string }>
		expectTypeOf<Q>().toEqualTypeOf<['a', string] | ['a']>()
	})
	test('three', () => {
		type Q = PathFromTag<{
			type: 'a'
			payload: { type: 'b'; payload: { x: number } }
		}>
		expectTypeOf<Q>().toEqualTypeOf<['a', 'b', { x: number }]>()
	})
}

export type TagOrPath<T extends AnyTag> = [T] | PathFromTag<T>

// this is not ment to be called directly, but rather used to make a function more convenient
export function tagOrPath<T extends AnyTag>(...args: TagOrPath<T>): T {
	return typeof args[0] === 'object' ? args[0] : (tag as any)(...args)
}

if (import.meta.vitest) {
	const { test, expect } = import.meta.vitest
	test('tagOrPath', () => {
		const t1 = tagOrPath({ type: 'a' }) satisfies { type: 'a' }
		expect(t1).toEqual({ type: 'a' })

		const t2 = tagOrPath<{ type: 'a'; payload?: string }>('a') satisfies {
			type: 'a'
		}
		expect(t2).toEqual({ type: 'a' })

		const t3 = tagOrPath('a', 'b') satisfies { type: 'a'; payload: 'b' }
		expect(t3).toEqual({ type: 'a', payload: 'b' })
	})
}
