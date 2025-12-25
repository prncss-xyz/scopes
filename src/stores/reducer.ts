import { noop, type Init } from '../functions'
import { type OnMount, type Teardown } from '../mount'
import { primitive, type ValueStore } from './primitive'
import { Store } from './store'

type LocalOnMount<Event> = (send: (event: Event) => void) => Teardown

export type Reducer<Props, State, Event, Result, Action> = (
	props: Props,
) => ReducerValues<State, Event, Result, Action>

interface ReducerValues<State, Event, Result, Action> {
	init: Init<State>
	reduce: (event: Event, last: State, act: (action: Action) => void) => State
	result?: (value: State) => Result
}

type ReducerProps<State, Event, Result, Action> = {
	reducer: ReducerValues<State, Event, Result, Action>
	createStore?: (init: Init<State>, onMount?: OnMount) => ValueStore<State>
	act?: (action: Action, send: (event: Event) => void) => void
}

export function reducer<State, Event, Action extends never, Result = State>(
	props: ReducerProps<State, Event, Result, Action>,
	onMount?: LocalOnMount<Event>,
): ReducerStore<State, Event, Result, Action>
export function reducer<State, Event, Action extends unknown, Result = State>(
	props: ReducerProps<State, Event, Result, Action> & { act: any },
	onMount?: LocalOnMount<Event>,
): ReducerStore<State, Event, Result, Action>
export function reducer<State, Event, Action, Result>(
	props: ReducerProps<State, Event, Result, Action>,
	onMount?: LocalOnMount<Event>,
) {
	return new ReducerStore(
		props.createStore ?? primitive<State>,
		props.reducer,
		'act' in props ? props.act : undefined,
		onMount,
	)
}

export class ReducerStore<State, Event, Result, Action> extends Store<
	Result,
	[Event],
	void
> {
	store
	#reduce
	#result
	#act
	constructor(
		createStore: (init: Init<State>, onMount?: OnMount) => ValueStore<State>,
		reducer: ReducerValues<State, Event, Result, Action>,
		act?: (action: Action, send: (event: Event) => void) => void,
		onMount?: LocalOnMount<Event>,
	) {
		super()
		this.store = createStore(
			reducer.init,
			onMount ? () => onMount(this.send.bind(this)) : undefined,
		)
		this.#reduce = reducer.reduce
		this.#result = reducer.result
		this.#act = act
	}
	send(event: Event) {
		const actions: Action[] = []
		const last = this.store.peek()
		const next = this.#reduce(event, last, (action) => actions.push(action))
		this.store.send(next)
		if (actions.length > 0)
			Promise.resolve().then(() =>
				actions.forEach((action) => this.#act!(action, this.send.bind(this))),
			)
	}
	canSend(event: Event) {
		const last = this.store.peek()
		let acted = false
		const next = this.#reduce(event, last, () => {
			acted = true
		})
		return acted || !Object.is(next, last)
	}
	simulate(event: Event) {
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
