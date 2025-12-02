import { getHash } from '../tanstack-utils'
import { Store } from '../scoped/store'
import { exhaustive, noop } from '../functions'


class Entry<Value> extends Store<Value, never> {
	protected count = 0
	protected parents: Set<Entry<any>> = new Set()
	handle = 0
	constructor(subscribe: (cb: () => void) => () => void, peek: () => Value) {
		super(exhaustive, subscribe, peek)
	}
	adjust(delta: number, remove: () => void) {
		this.count += delta
		if (this.count < 0) throw new Error('entry.count < 0')
	}
}

type Parents = Set<Entry<any>>
type Scoped<Keys extends any[], Value> = (...keys: Keys) => Entry<Value>
type Read = <Keys extends any[], Value>(
	scoped: Scoped<Keys, Value>,
	...keys: Keys
) => Value

export function createScopedValue<Keys extends any[], Value>(
	create: (read: Read, ...key: Keys) => Value,
) {
	const store = new Map<string, Entry<Value>>()
	return function getEntry(...keys: Keys): Entry<Value> {
		const hash = getHash([...keys])
		const retrieved = store.get(hash)
		if (retrieved) return retrieved
		const parents: Parents = new Set()
		let count = 0
		const value = create(
			(scoped, ...keys) => {
				const entry = scoped(...keys)
				parents.add(entry)
				return entry.peek()
			},
			...keys,
		)
		function adjust(delta: number) {
			count += delta
			if (count < 0) throw new Error('entry.count < 0')
			if (count === 0)
				Promise.resolve().then(() => count === 0 && store.delete(hash))
			parents.forEach((e) => e.adjust(delta))
		}
		const created = new Store(
			exhaustive,
			() => {
				adjust(1)
				return () => adjust(-1)
			},
			() => value,
			{ adjust },
		)
		store.set(hash, created)
		return created
	}
}
