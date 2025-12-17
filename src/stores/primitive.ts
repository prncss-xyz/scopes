import { fromInit, type Init } from '../functions'
import type { OnMount } from '../mount'
import { Subscribed } from './subscribed'

export interface ReducerProps<Value, Action, Result> {
	init: Init<Value>
	reduce: (action: Action, last: Value) => Value
	result?: (value: Value) => Result
}

export const RESET: unique symbol = Symbol(
	import.meta.env?.MODE !== 'production' ? 'RESET' : '',
)

export class PrimitiveStore<Value> extends Subscribed<
	Value,
	[Value | typeof RESET],
	void
> {
	private init
	private dirty = false
	protected value: Value = undefined as never
	constructor(props: ReducerProps<Value, Value, Value>, onMount?: OnMount) {
		super(onMount)
		this.init = props.init
	}
	private makeDirty() {
		if (this.dirty) return
		this.dirty = true
		this.value = fromInit(this.init)
	}
	send(arg: Value) {
		this.makeDirty()
		const nextValue = arg === RESET ? fromInit(this.init) : arg
		if (Object.is(nextValue, this.value)) return
		this.value = nextValue
		this.notify()
	}
	peek() {
		this.makeDirty()
		return this.value
	}
}
