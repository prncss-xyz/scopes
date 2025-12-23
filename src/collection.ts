import type { OnMount, Teardown } from './mount'
import { getHash } from './tanstack-utils'

const handle = 0
const payload = 1

export function familly<Key, Props, Payload>(
	template: (props: Props, onMount?: OnMount) => Payload,
	factory: (key: Key) => Props,
	ttl = 0,
) {
	return collection((key: Key) => template(factory(key)), ttl)
}

export function collection<Key, Payload>(
	factory: (key: Key, onMount?: OnMount) => Payload,
	ttl: number,
	onMount?: OnMount,
): (key: Key) => Payload {
	type Entry = [number, Payload]
	const store = new Map<string, Entry>()
	let count = 0
	let teardown: Teardown = undefined
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
				if (count === 0) teardown = onMount?.()
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
