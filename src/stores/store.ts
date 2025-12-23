import type { OnMount, Teardown } from '../mount'

export function noWrite(..._: [never]): never {
	throw new Error('Cannot write to a read-only store')
}

interface IStore<Value, Args extends any[], Result> {
	send(...args: Args): Result
	subscribe(cb: () => void): () => void
	peek(): Value
}

export abstract class Store<Value, Args extends any[], Result>
	implements IStore<Value, Args, Result>
{
	#uOnmount
	#uUnmount: Teardown = undefined
	abstract send(...args: Args): Result
	abstract subscribe(cb: () => void): () => void
	abstract peek(): Value
	readonly index
	#count = 0
	constructor(onMount?: OnMount) {
		this.#uOnmount = onMount
		this.index = ++this.#count
	}
	protected mount() {
		this.#uUnmount = this.#uOnmount?.()
	}
	protected unmount() {
		this.#uUnmount?.()
	}
}
