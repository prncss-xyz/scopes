import { useEffect } from 'react'
import type { OnMount, Teardown } from './mount'
import { collection } from './collection'

export function createValue<Args extends any[], Value>(
	gen: (...args: Args) => Value,
) {
	const cache = collection(
		<Value>(value: Value, onMount?: OnMount) => {
			let count = 0
			let unmount: Teardown
			const unm = () => {
				if (count === 0) unmount = onMount?.()
				count++
				return () => {
					count--
					if (count === 0) unmount?.()
				}
			}
			return [value, unm] as const
		},
		(key: Args) => gen(...key),
	)
	return function useValue(...args: Args) {
		const [value, unm] = cache(args)
		useEffect(() => unm(), [unm])
		return value
	}
}
