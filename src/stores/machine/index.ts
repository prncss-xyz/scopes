import { noop, type Init } from '../../functions'
import { type OnMount, type Teardown } from '../../mount'
import { primitive, type ValueStore } from '../primitive'
import { Store } from '../store'

type LocalOnMount<EventIn> = (send: (event: EventIn) => void) => Teardown

type NonUnderscore<S> = S extends `_${string}` ? never : S
export type Public<E> = E extends { type: string }
	? E & { type: NonUnderscore<E['type']> }
	: E

export type Machine<Props, State, EventIn, Result, EventOut> = (
	props: Props,
) => MachineValues<State, EventIn, Result, EventOut>

interface MachineValues<State, EventIn, Result, EventOut> {
	init: Init<State>
	reduce: (
		event: EventIn,
		last: State,
		send: (eventOut: EventOut) => void,
	) => State
	result?: (value: State) => Result
}

type MachineProps<State, EventIn, Result, EventOut> = {
	reducer: MachineValues<State, EventIn, Result, EventOut>
	createStore?: (init: Init<State>, onMount?: OnMount) => ValueStore<State>
	onSend?: (eventOut: EventOut, send: (event: EventIn) => void) => void
}

// TODO: have a sendable param and make Public act when it's there
export function machineProps<
	State,
	EventIn,
	EventOut extends never,
	Result = State,
>(
	props: MachineProps<State, EventIn, Result, EventOut>,
	onMount?: LocalOnMount<EventIn>,
): MachineStore<State, Public<EventIn>, Result, EventOut>
export function machineProps<State, EventIn, EventOut, Result = State>(
	props: MachineProps<State, EventIn, Result, EventOut> & { onSend: any },
	onMount?: LocalOnMount<EventIn>,
): MachineStore<State, Public<EventIn>, Result, EventOut>
export function machineProps<State, EventIn, EventOut, Result>(
	props: MachineProps<State, EventIn, Result, EventOut>,
	onMount?: LocalOnMount<EventIn>,
) {
	return new MachineStore(
		props.createStore ?? primitive<State>,
		props.reducer,
		'onSend' in props ? props.onSend : undefined,
		onMount,
	)
}

export class MachineStore<State, EventIn, Result, EventOut> extends Store<
	Result,
	[EventIn],
	void
> {
	store
	#reduce
	#result
	#onSend
	constructor(
		createStore: (init: Init<State>, onMount?: OnMount) => ValueStore<State>,
		reducer: MachineValues<State, EventIn, Result, EventOut>,
		onSend?: (eventOut: EventOut, send: (eventIn: EventIn) => void) => void,
		onMount?: LocalOnMount<EventIn>,
	) {
		super()
		this.store = createStore(
			reducer.init,
			onMount ? () => onMount(this.send.bind(this)) : undefined,
		)
		this.#reduce = reducer.reduce
		this.#result = reducer.result
		this.#onSend = onSend
	}
	send(event: EventIn) {
		const eventsOut: EventOut[] = []
		const last = this.store.peek()
		const next = this.#reduce(event, last, (eventOut) =>
			eventsOut.push(eventOut),
		)
		this.store.send(next)
		if (eventsOut.length > 0)
			Promise.resolve().then(() =>
				eventsOut.forEach((eventOut) =>
					this.#onSend!(eventOut, this.send.bind(this)),
				),
			)
	}
	canSend(event: EventIn) {
		const last = this.store.peek()
		let dirty = false
		const next = this.#reduce(event, last, () => {
			dirty = true
		})
		return dirty || !Object.is(next, last)
	}
	simulate(event: EventIn) {
		const last = this.store.peek()
		const next = this.#reduce(event, last, noop)
		return this.#result ? this.#result(next) : (next as never)
	}
	subscribe(cb: () => void): () => void {
		return this.store.subscribe(cb)
	}
	peek(): Result {
		return this.#result
			? this.#result(this.store.peek())
			: (this.store.peek() as never)
	}
}
