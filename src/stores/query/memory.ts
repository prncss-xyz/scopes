import { type StorageProps } from '.'
import { isReset } from '../../functions'

function delayed<Value>(value: Value, delay?: number) {
	return new Promise<Value>((resolve) => {
		setTimeout(() => resolve(value), delay ?? 0)
	})
}

export function memoryStorage<Key, Data>({
	getDefault,
	delay,
}: {
	getDefault: (key: Key) => Data
	delay?: number
}): StorageProps<Key, Data> {
	delay ??= 700
	const storage = new Map<Key, Data>()
	return {
		get: (key) =>
			delayed(storage.has(key) ? storage.get(key)! : getDefault(key), delay),
		set: (key, value) => {
			console.log('set', key, value)
			if (isReset(value)) {
				storage.delete(key)

			} else storage.set(key, value)
		},
    del: (key) => {
      storage.delete(key)
      return getDefault(key)
    }
	}
}
