import type { OnMount, Unmount } from '../family'
import { noop } from '../functions'
import { Store } from './store'
import { Subscribed } from './subscribed'

function noRead(): never {
	throw new Error('Cannot read from a write-only store')
}

function noWrite(): never {
	throw new Error(`Cannot write to a read-only store`)
}

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
		setter ?? noWrite,
		noop,
		onMount,
	)
}

export function effect(getter: (read: Read) => Unmount, onMount?: OnMount) {
	return new EffectStore(getter, onMount)
}

class DerivedStore<Value, Args extends any[], Result> extends Subscribed<
	Value,
	Args,
	Result
> {
	private getter
	private setter
	private valueCleanup // this is a hook to implement effect
	dirty = true
	value: Value = undefined as any
	storeToUnsubscribe = new Map<Store<any, any[], any>, () => void>()
	constructor(
		getter: (read: Read) => Value,
		setter: (read: Read, write: Write, ...args: Args) => Result,
		valueCleanup: (value: Value) => void,
		onMount?: OnMount,
	) {
		super(onMount)
		this.getter = getter
		this.setter = setter
		this.valueCleanup = valueCleanup
	}
	send(...args: Args) {
		return this.setter(
			(store) => store.peek(),
			(store, ...a) => store.send(...a),
			...args,
		)
	}
	peek() {
		if (this.dirty) {
			this.dirty = false
			this.valueCleanup(this.value)
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

class EffectStore extends DerivedStore<Unmount, [never], never> {
	private valueUnmount: Unmount = undefined
	constructor(getter: (read: Read) => Unmount, onMount?: OnMount) {
		super(getter, noWrite, () => this.valueUnmount?.(), onMount)
	}
	peek() {
		Promise.resolve().then(() => {
			this.valueUnmount = super.peek()
		})
	}
	protected unmount(): void {
		this.valueUnmount?.() // unmount is expected to be called asynchronously
		super.unmount()
	}
}
