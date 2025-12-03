import { getHash } from './tanstack-utils'

export type OnMount = () => (() => void) | void
export type UnMount = ReturnType<OnMount>

const handle = 0
const payload = 1

export function family<Key, Props, Payload>(
	factory: (props: Props, onMount?: OnMount) => Payload,
	create: (key: Key) => Props,
	ttl = 0,
): (key: Key) => Payload {
	type Entry = [number, Payload]
	const store = new Map<string, Entry>()
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
			factory(
				create(key),
				ttl === Infinity
					? undefined
					: () => {
							return () => {
								created[handle] = setTimeout(() => store.delete(hash), ttl)
							}
						},
			),
		] as Entry
		store.set(hash, created)
		return created[payload]
	}
}
