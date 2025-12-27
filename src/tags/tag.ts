import type { Tag } from './core'

type GetObject<Path> = Path extends [PropertyKey]
	? Tag<Path[0], void>
	: GetObject0<Path>
type GetObject0<Path> = Path extends [PropertyKey, unknown]
	? Tag<Path[0], Path[1]>
	: Path extends [PropertyKey, ...infer Rest]
		? Tag<Path[0], GetObject0<Rest>>
		: never

export function tag<
	const Path extends [PropertyKey, ...PropertyKey[], any] | [PropertyKey],
>(...path: Path): GetObject<Path>
export function tag(...path: any): any {
	if (path.length === 1) {
		return { type: path[0] }
	}
	return tag0(path)
}
function tag0(path: any): any {
	if (path.length === 2) return { type: path[0], payload: path[1] }
	const [type, ...rest] = path
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
