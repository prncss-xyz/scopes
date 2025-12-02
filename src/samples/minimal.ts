import { useEffect } from 'react'

export function createScoped<Key, Value>(create: (key: Key) => Value) {
	type Entry = { value: Value; count: number }
	const store = new Map<Key, Entry>()
	return function useScoped(key: Key) {
		let entry = store.get(key)
		if (!entry) {
			entry = { value: create(key), count: 0 }
			store.set(key, entry)
		}
		useEffect(() => {
			entry.count++
			return () => {
				entry.count--
				// this avoids deleting entry if we unmout and mount on the same rendering cycle
				if (entry.count === 0)
					Promise.resolve().then(() => entry.count === 0 && store.delete(key))
			}
		}, [key, entry])
		return entry.value
	}
}
