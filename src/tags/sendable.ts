import type { Tag } from './core'

type GetObject<T> = T extends [PropertyKey] ? Tag<T[0], void> : GetObject0<T>
type GetObject0<T> = T extends [PropertyKey, unknown]
	? Tag<T[0], T[1]>
	: T extends [PropertyKey, ...infer Rest]
		? Tag<T[0], GetObject0<Rest>>
		: never

export function tag<const T extends [PropertyKey, ...any[]]>(
	...path: T
): GetObject<T>
export function tag(...path: any): any {
	return tag0(path)
}

function tag0(path: any): any {
	const [type, ...rest] = path
	if (rest.length === 0) {
		return { type }
	}
	if (rest.length === 1) {
		return { type, payload: rest[0] }
	}
	return { type, payload: tag0(rest) }
}

if (import.meta.vitest) {
	const { test, expect } = import.meta.vitest
	test('one argument', () => {
		const t1 = tag('a') satisfies { type: 'a' }
		expect(t1).toEqual({ type: 'a' })
	})
	test('two arguments', () => {
		const t2 = tag('a', 'b') satisfies { type: 'a'; payload: 'b' }
		expect(t2).toEqual({ type: 'a', payload: 'b' })
	})
	test('three arguments', () => {
		const t3 = tag('a', 'b', 'c') satisfies {
			type: 'a'
			payload: { type: 'b'; payload: 'c' }
		}
		expect(t3).toEqual({
			type: 'a',
			payload: { type: 'b', payload: 'c' },
		})
	})
}
