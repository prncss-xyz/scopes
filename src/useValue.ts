import { useEffect } from 'react'
import { family, type OnMount, type Unmount } from './family'

export function createValue<Args extends any[], Value>(
	gen: (...args: Args) => Value,
) {
	const cache = family(
		<Value>(value: Value, onMount?: OnMount) => {
			let count = 0
			let unmount: Unmount
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
