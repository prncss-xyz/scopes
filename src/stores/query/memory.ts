import { query } from '.'

function delayed<Value>(value: Value, delay?: number) {
	return new Promise<Value>((resolve) => {
		setTimeout(() => resolve(value), delay ?? 0)
	})
}

export function memoryStorage<Key, Data>({
	ttl,
	staleTime,
	getDefault,
	isDefault, // TODO: use a remove symbol instead
	delay,
}: {
	ttl?: number
	staleTime?: number
	getDefault: (key: Key) => Data
	isDefault: (data: Data) => boolean
	delay?: number
}) {
	const storage = new Map<Key, Data>()
	return query<Key, Data>({
		ttl,
		staleTime,
		get: (key) =>
			delayed(storage.has(key) ? storage.get(key)! : getDefault(key), delay),
		set: (key, value) => {
			if (isDefault(value)) storage.delete(key)
			else storage.set(key, value)
		},
	})
}
