import type { OnMount, Teardown } from './mount'
import { getHash } from './tanstack-utils'

const handle = 0
const payload = 1

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

export function collection<Key, Payload, Encoded>(
	factory: (key: Key, onMount?: OnMount) => Payload,
	opts?: {
		ttl?: number
		onMount?: OnMount
		hydrate?: {
			values: Iterable<[Key, Encoded]>
			decode: (value: Encoded) => Payload
		}
	},
): (key: Key) => Payload {
	const ttl = opts?.ttl ?? 0
	type Entry = [number, Payload]
	const store = new Map<string, Entry>()
	let count = 0
	let teardown: Teardown = undefined
	if (opts?.hydrate) {
		for (const [key, value] of opts.hydrate.values)
			store.set(getHash(key), [0, opts.hydrate.decode(value)])
	}
	return (key: Key) => {
		const hash = getHash(key)
		const cached = store.get(hash)
		if (cached) {
			if (cached[handle]) {
				clearTimeout(cached[handle])
				cached[handle] = 0
			}
			return cached[payload]
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
						created[handle] = setTimeout(() => store.delete(hash), ttl)
				}
			}),
		] as Entry
		store.set(hash, created)
		return created[payload]
	}
}
