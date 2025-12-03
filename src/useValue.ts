import { useEffect } from 'react'
import { family, type OnMount, type UnMount } from './family'

export function createValue<Key, Value>(gen: (key: Key) => Value) {
	const cache = family(<Value>(value: Value, onMount?: OnMount) => {
		let count = 0
		let unMount: UnMount
		const unm = () => {
			if (count === 0) unMount = onMount?.()
			count++
			return () => {
				count--
				if (count === 0) unMount?.()
			}
		}
		return [value, unm] as const
	}, gen)
	return function useValue(key: Key) {
		const [value, unm] = cache(key)
		useEffect(() => unm(), [unm])
		return value
	}
}
