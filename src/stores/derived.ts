import { noop } from '../functions'
import type { OnMount, Teardown } from '../mount'
import { Store } from './store'
import { Counted, Subscribed } from './subscribed'

// FEAT: make derived stores work with suspend

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
		onMount,
	)
}

export function effect(getter: (read: Read) => Teardown, onMount?: OnMount) {
	return new EffectStore(getter, onMount)
}

class DerivedStore<Value, Args extends any[], Result> extends Subscribed<
	Value,
	Args,
	Result
> {
	#getter
	#setter
	dirty = true
	value: Value = undefined as any
	storeToUnsubscribe = new Map<Store<any, any[], any>, () => void>()
	constructor(
		getter: (read: Read) => Value,
		setter: (read: Read, write: Write, ...args: Args) => Result,
		onMount?: OnMount,
	) {
		super(onMount)
		this.#getter = getter
		this.#setter = setter
	}
	send(...args: Args) {
		return this.#setter(
			(store) => store.peek(),
			(store, ...a) => store.send(...a),
			...args,
		)
	}
	peek() {
		if (this.dirty) {
			this.dirty = false
			const dependancies = new Set<Store<any, any[], any>>()
			this.value = this.#getter((store) => {
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

class EffectStore extends Counted<void, [never], never> {
	#teardownEffect: Teardown = undefined
	#teardownHandler: Teardown = undefined
	#handler
	constructor(getter: (read: Read) => Teardown, onMount?: OnMount) {
		super(onMount)
		this.#handler = new DerivedStore(getter, noWrite, noop)
	}
	peek() {}
	send(): never {
		throw new Error('Cannot send to an effect store')
	}
	protected mount() {
		this.#teardownHandler = this.#handler.subscribe(() => {
			this.#teardownEffect?.()
			this.#teardownEffect = this.#handler.peek()
		})
		this.#teardownEffect = this.#handler.peek()
	}
	protected unmount() {
		super.unmount
		this.#teardownEffect?.()
		this.#teardownEffect = undefined
		this.#teardownHandler?.()
	}
}
