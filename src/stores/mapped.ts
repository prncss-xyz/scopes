import { Store } from './store'
import { Subscribed } from './subscribed'

export function mappedStore<Value, V, Args extends any[], Result>(
	store: Store<Value, Args, Result>,
	mapper: (value: Value) => V,
) {
	return new MappedStore(store, mapper)
}

class MappedStore<Value, V, Args extends any[], Result> extends Subscribed<
	V,
	Args,
	Result
> {
	#store
	#mapper
	constructor(store: Store<Value, Args, Result>, mapper: (value: Value) => V) {
		super()
		this.#store = store
		this.#mapper = mapper
	}
	send(...args: Args): Result {
		return this.#store.send(...args)
	}
	subscribe(cb: () => void): () => void {
		return this.#store.subscribe(cb)
	}
	peek(): V {
		return this.#mapper(this.#store.peek())
	}
}

export function chainedStore<Value, V, Args extends any[], Result>(
	store: Store<Value, Args, Result>,
	chainer: (value: Value) => Store<V, Args, Result>,
) {
	return new ChainedStore(store, chainer)
}

class ChainedStore<Value, V, A extends any[], R> extends Store<V, A, R> {
	#store: Store<Value, any, any>
	#chainer: (value: Value) => Store<V, A, R>
	constructor(
		store: Store<Value, any, any>,
		chainer: (value: Value) => Store<V, A, R>,
	) {
		super()
		this.#store = store
		this.#chainer = chainer
	}
	private getInnerStore(): Store<V, A, R> {
		return this.#chainer(this.#store.peek())
	}
	send(...args: A): R {
		return this.getInnerStore().send(...args)
	}
	subscribe(cb: () => void): () => void {
		return this.getInnerStore().subscribe(cb)
	}
	peek(): V {
		return this.getInnerStore().peek()
	}
}
