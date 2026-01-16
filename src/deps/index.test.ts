import { describe, expect, test } from 'vitest'
import { dependancy, createContainer, type Dependancies } from '.'
import { pipe } from '../functions/pipe'

type A = Dependancies<{ a: number }>

describe('deps', () => {
	const parent = createContainer(
		pipe(
			dependancy('b', ({ a }: { a: number }) => a * 2),
			dependancy('a', () => 1) satisfies A,
		),
	)
	const c = createContainer(
		pipe(
			dependancy('c', ({ a, b }: { a: 1; b: number }) => a + b),
			dependancy('d', () => Math.random()),
			dependancy('$d', () => Math.random()),
		),
		parent,
	)
	test('should work', () => {
		expect(c.a).toBe(1)
		expect(c.b).toBe(2)
		expect(c.c).toBe(3)
	})
	test('stability', () => {
		expect(c.d).toBe(c.d)
		expect(c.$d).not.toBe(c.$d)
	})
})
