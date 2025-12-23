import { exhaustive } from '../../functions'
import { Store } from '../store'
import type { State, Event } from './machine'

export function suspended<Data>(
	store: Store<State<Data>, [Event<Data>], void>,
) {
	return new Suspended(store)
}

export class Suspended<Data> extends Store<
	Data | Promise<Data>,
	[Event<Data>],
	void
> {
	#store
	constructor(store: Store<State<Data>, [Event<Data>], void>) {
		super()
		this.#store = store
	}
	peek() {
		const raw = this.#store.peek()
		switch (raw.type) {
			case 'error':
				throw raw.payload
			case 'pending':
				this.#store.send({ type: 'prefetch' })
				return raw.payload.promise
			case 'success':
				return raw.payload.promise ?? raw.payload.data
			default:
				return exhaustive(raw)
		}
	}
	send(event: Event<Data>) {
		this.#store.send(event)
	}
	subscribe(callback: () => void) {
		return this.#store.subscribe(callback)
	}
}
