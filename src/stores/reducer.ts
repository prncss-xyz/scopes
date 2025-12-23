import { noop, type Init } from '../functions'
import { type OnMount } from '../mount'
import { primitive, type ValueStore } from './primitive'
import { Store } from './store'

export type Reducer<Props, State, Event, Result, Action> = (
	props: Props,
) => ReducerValues<State, Event, Result, Action>

interface ReducerValues<State, Event, Result, Action> {
	init: Init<State>
	reduce: (event: Event, last: State, act: (action: Action) => void) => State
	result?: (value: State) => Result
}

export type ReducerProps<State, Event, Result, Action> = {
	reducer: ReducerValues<State, Event, Result, Action>
	createStore?: (init: Init<State>, onMount?: OnMount) => ValueStore<State>
} & (never extends Action ? { act: (action: Action) => void } : {}) // FIXME:

export function reducer<State, Event, Result = State, Action = never>(
	props: ReducerProps<State, Event, Result, Action>,
	onMount?: OnMount,
) {
	return new ReducerStore(
		props.createStore ?? primitive<State>,
		props.reducer,
		'act' in props ? props.act : undefined,
		onMount,
	)
}

class ReducerStore<State, Event, Result, Action> extends Store<
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
		act?: (action: Action) => void,
		onMount?: OnMount,
	) {
		super()
		this.store = createStore(reducer.init, onMount)
		this.#reduce = reducer.reduce
		this.#result = reducer.result
		this.#act = act
	}
	send(event: Event) {
		const actions: Action[] = []
		const last = this.store.peek()
		const next = this.#reduce(event, last, (action: Action) => {
			actions.push(action)
		})
		this.store.send(next)
		const act = this.#act
		if (act) actions.forEach(act)
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
