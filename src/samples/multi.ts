import { useEffect } from 'react'
import { getHash } from '../tanstack-utils'

export function createScoped<Keys extends any[], Value>(
	create: (...keys: Keys) => Value,
) {
	type Entry = { value: Value; count: number }
	const store = new Map<string, Entry>()
	return function useScoped(...keys: Keys) {
		const hash = getHash([...keys])
		let entry = store.get(hash)
		if (!entry) {
			entry = { value: create(...keys), count: 0 }
			store.set(hash, entry)
		}
		useEffect(() => {
			entry.count++
			return () => {
				entry.count--
				// this avoids deleting entry if we unmout and mount on the same rendering cycle
				if (entry.count === 0)
					Promise.resolve().then(() => entry.count === 0 && store.delete(hash))
			}
		}, [hash, entry])
		return entry.value
	}
}
