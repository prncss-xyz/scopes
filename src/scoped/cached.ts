import { getHash } from '../tanstack-utils'

const handle = 0
const count = 1
const payload = 2

const noop = () => () => {}

export function cached<Keys extends any[], Payload>(
	create: (mount: () => () => void, ...keys: Keys) => Payload,
	ttl: number,
) {
	type Entry = [number, number, Payload]
	const store = new Map<string, Entry>()
	return (...keys: Keys) => {
		const hash = getHash([...keys])
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
			0,
			create(
				ttl === Infinity
					? noop
					: () => {
							created[count]++
							return () => {
								created[count]--
								if (created[count] === 0)
									created[handle] = setTimeout(() => store.delete(hash), ttl)
							}
						},
				...keys,
			),
		] as Entry
		store.set(hash, created)
		return created[payload]
	}
}
