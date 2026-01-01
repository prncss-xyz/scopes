import type { OnMount, Teardown } from './mount'
import { getHash } from './tanstack-utils'

const HANDLE = 0
const PAYLOAY = 1
const KEY = 2

export function familly<Key, Props, Payload, Encoded>(
	template: (props: Props, onMount?: OnMount) => Payload,
	factory: (key: Key) => Props,
	opts?: {
		ttl?: number
		onMount?: OnMount
		hydrate?: {
			values: Iterable<[Key, Encoded]>
			decode: (value: Encoded) => Payload
		}
	},
) {
	return collection((key: Key) => template(factory(key)), opts)
}

const clearCollectionEntriesCallbacks: ((
	filter: (u: unknown) => boolean,
) => void)[] = []
export function clearCollectionEntries(filter: (u: unknown) => boolean) {
	clearCollectionEntriesCallbacks.forEach((clear) => clear(filter))
}

export function collection<Key, Payload, Encoded>(
	factory: (key: Key, onMount?: OnMount) => Payload,
	opts?: {
		ttl?: number
		onMount?: OnMount
		hydrate?: {
			values: Iterable<[Key, Encoded]>
			decode: (value: Encoded, key: Key) => Payload
		}
	},
) {
	const ttl = opts?.ttl ?? 0
	type Entry = [number, Payload, Key]
	const store = new Map<string, Entry>()
	let count = 0
	let teardown: Teardown = undefined
	if (opts?.hydrate) {
		for (const [key, value] of opts.hydrate.values)
			store.set(getHash(key), [0, opts.hydrate.decode(value, key), key])
	}
	clearCollectionEntriesCallbacks.push((filter) => {
		store.forEach((entry) => {
			if (filter(entry[KEY])) store.delete(getHash(entry[KEY]))
		})
	})
	return {
		forEach(callback: (key: Key, payload: Payload) => void) {
			store.forEach((entry) => callback(entry[KEY], entry[PAYLOAY]))
		},
		get(key: Key) {
			const hash = getHash(key)
			const cached = store.get(hash)
			if (cached) {
				if (cached[HANDLE]) {
					clearTimeout(cached[HANDLE])
					cached[HANDLE] = 0
				}
				return cached[PAYLOAY]
			}
			const created = [
				0,
				factory(key, () => {
					if (count === 0) teardown = opts?.onMount?.()
					++count
					return () => {
						--count
						if (count === 0) teardown?.()
						if (ttl !== Infinity)
							created[HANDLE] = setTimeout(() => store.delete(hash), ttl)
					}
				}),
				key,
			] as Entry
			store.set(hash, created)
			return created[PAYLOAY]
		},
	}
}
