import { type StorageProps } from '.'

function delayed<Value>(value: Value, delay?: number) {
	return new Promise<Value>((resolve) => {
		setTimeout(() => resolve(value), delay ?? 0)
	})
}

export function memoryStorage<Key, Data>({
	getDefault,
	isDefault, // TODO: use a remove symbol instead
	delay,
}: {
	getDefault: (key: Key) => Data
	isDefault: (data: Data) => boolean
	delay?: number
}): StorageProps<Key, Data> {
  delay ??= 700
	const storage = new Map<Key, Data>()
	return {
		get: (key) =>
			delayed(storage.has(key) ? storage.get(key)! : getDefault(key), delay),
		set: (key, value) => {
			if (isDefault(value)) storage.delete(key)
			else storage.set(key, value)
		},
	}
}
