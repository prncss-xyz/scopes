import { type StorageProps } from '.'
import { fromInit, isReset, type Init } from '../../functions'

export function delayed<Value = void>(delay: number, value?: Init<Value>) {
	return new Promise<Value>((resolve) => {
		setTimeout(
			() =>
				resolve(value === undefined ? (undefined as never) : fromInit(value)),
			delay ?? 0,
		)
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
			delayed(delay, storage.has(key) ? storage.get(key)! : getDefault(key)),
		set: (key, value) => {
			if (isReset(value)) {
				storage.delete(key)
			} else storage.set(key, value)
		},
		del: (key) => {
			storage.delete(key)
			return getDefault(key)
		},
	}
}
