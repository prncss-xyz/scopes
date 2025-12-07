import type { OnMount } from '../family'
import { noRead, noWrite, Store } from './store'
import { Subscribed } from './subscribed'

type Read = <Value>(store: Store<Value, any[], any>) => Value
type Write = <Args extends any[], Result>(
	store: Store<any, Args, Result>,
	...args: Args
) => void

export function derived<
	Value = never,
	Args extends any[] = [never],
	Result = never,
>(
	{
		getter,
		setter,
	}: {
		getter?: (read: Read) => Value
		setter?: (read: Read, write: Write, ...args: Args) => Result
	},
	onMount?: OnMount,
) {
	return new DerivedStore<Value, Args, Result>(
		getter ?? noRead,
		setter ?? (noWrite as never),
		onMount,
	)
}

class DerivedStore<Value, Args extends any[], Result> extends Subscribed<
	Value,
	Args,
	Result
> {
	private getter
	private setter
	dirty = true
	value: Value = undefined as any
	storeToUnsubscribe = new Map<Store<any, any[], any>, () => void>()
	constructor(
		getter: (read: Read) => Value,
		setter: (read: Read, write: Write, ...args: Args) => Result,
		onMount?: OnMount,
	) {
		super(onMount)
		this.getter = getter
		this.setter = setter
	}
	send(...args: Args) {
		return this.setter(
			(store) => store.peek(),
			(store, ...a) => store.send(...a),
			...args,
		)
	}
	peek(): Value {
		if (this.dirty) {
			this.dirty = false
			const dependancies = new Set<Store<any, any[], any>>()
			this.value = this.getter((store) => {
				dependancies.add(store)
				return store.peek()
			})
			for (const [store, unsubscribe] of this.storeToUnsubscribe)
				if (!dependancies.has(store)) {
					unsubscribe()
					this.storeToUnsubscribe.delete(store)
				}
			for (const store of dependancies)
				if (!this.storeToUnsubscribe.has(store))
					this.storeToUnsubscribe.set(
						store,
						store.subscribe(() => {
							this.dirty = false
							this.notify()
						}),
					)
		}
		return this.value
	}
}
