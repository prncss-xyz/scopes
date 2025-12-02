import { noWrite, Store } from './store'

type Read = <Value>(store: Store<Value, any[], any>) => Value
type Write = <Args extends any[], Result>(
	store: Store<any, Args, Result>,
	...args: Args
) => void

export function createDerived<
	Value = never,
	Args extends any[] = [never],
	Result = never,
>(
	getter: (read: Read) => Value,
	setter: (read: Read, write: Write, ...args: Args) => Result = noWrite,
	onMount?: () => (() => void) | void,
) {
	let dirty = true
	let value: Value
	const storeToUnsubscribe = new Map<Store<any, any[], any>, () => void>()
	const subscribers = new Set<() => void>()
	let unmount: (() => void) | void = undefined
	return new Store<Value, Args, Result>(
		(...args: Args) =>
			setter(
				(store) => store.peek(),
				(store, ...a) => store.send(...a),
				...args,
			),
		(cb: () => void) => {
			if (subscribers.size === 0) unmount = onMount?.()
			subscribers.add(cb)
			return () => {
				subscribers.delete(cb)
				if (subscribers.size > 0) return
				unmount?.()
			}
		},
		() => {
			if (dirty) {
				dirty = false
				const dependancies = new Set<Store<any, any[], any>>()
				value = getter((store) => {
					dependancies.add(store)
					return store.peek()
				})
				for (const [store, unsubscribe] of storeToUnsubscribe)
					if (!dependancies.has(store)) {
						unsubscribe()
						storeToUnsubscribe.delete(store)
					}
				for (const store of dependancies)
					if (!storeToUnsubscribe.has(store))
						storeToUnsubscribe.set(
							store,
							store.subscribe(() => {
								dirty = false
								subscribers.forEach((fn) => fn())
							}),
						)
			}
			return value
		},
	)
}
