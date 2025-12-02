import { useEffect } from 'react'
import { cached } from './cached'

export function createCachedValue<Value, Keys extends any[]>(
	create: (...keys: Keys) => Value,
	ttl: number,
) {
	const store = cached((mount, ...keys: Keys) => {
		const value = create(...keys)
		return function useCachedValue() {
			useEffect(() => mount(), [mount])
			return value
		}
	}, ttl)
	return function useCached(...keys: Keys) {
		return store(...keys)()
	}
}
