import { describe, it, expectTypeOf } from 'vitest'
import { type OptionalUndefined } from './types'

describe('OptionalUndefined', () => {
	it('should make fields that can be undefined optional', () => {
		type Input = {
			a: string
			b: number | undefined
			c?: boolean
		}

		type Expected = {
			a: string
			b?: number | undefined
			c?: boolean
		}

		expectTypeOf<OptionalUndefined<Input>>().toEqualTypeOf<Expected>()
	})

	it('should not change types that have no undefined fields', () => {
		type Input = {
			a: string
			b: number
		}

		expectTypeOf<OptionalUndefined<Input>>().toEqualTypeOf<Input>()
	})

	it('should handle all optional fields', () => {
		type Input = {
			a: string | undefined
			b?: number
		}

		type Expected = {
			a?: string | undefined
			b?: number
		}

		expectTypeOf<OptionalUndefined<Input>>().toEqualTypeOf<Expected>()
	})

	it('should preserve readonly modifier', () => {
		type Input = {
			readonly a: string
			readonly b: number | undefined
		}

		type Expected = {
			readonly a: string
			readonly b?: number | undefined
		}

		expectTypeOf<OptionalUndefined<Input>>().toEqualTypeOf<Expected>()
	})
})
