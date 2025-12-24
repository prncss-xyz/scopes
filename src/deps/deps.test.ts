import { describe, expect, test } from 'vitest'
import { dependancy, inject, type Dependancies } from '.'
import { pipe } from '../functions/pipe'

type A = Dependancies<{ a: number }>

describe('deps', () => {
	const a = dependancy('a', () => 1) satisfies A
	const b = dependancy('b', ({ a }: { a: number }) => a * 2)
	const c = dependancy('c', ({ a, b }: { a: 1; b: number }) => a + b)
	const s = inject(pipe(a, b, c))
	test('should work', () => {
		expect(s.a).toBe(1)
		expect(s.b).toBe(2)
		expect(s.c).toBe(3)
		expect('a' in s).toBe(true)
		expect('b' in s).toBe(true)
		expect('c' in s).toBe(true)
	})
	test('should enumerate', () => {
		expect(Object.entries(s)).toEqual([
			['a', 1],
			['b', 2],
			['c', 3],
		])
	})
})
