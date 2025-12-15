import { fromInit, id, setState, type Init } from '../functions'
import type { OnMount } from '../types'
import { Subscribed } from './subscribed'

export interface ReducerProps<Value, Action, Result> {
	init: Init<Value>
	reduce: (action: Action, last: Value) => Value
	result?: (value: Value) => Result
	onChange?: (next: Value, last: Value) => void
}

export type Reducer<Props, Value, Action, Result> = (
	props: Props,
) => ReducerProps<Value, Action, Result>

export function state<Value>(init: Init<Value>, onMount?: OnMount) {
	return new ReducerStore(
		{
			init,
			reduce: setState<Value>,
			result: id,
		},
		onMount,
	)
}

export function reducer<Value, Action, Result = Value>(
	props: ReducerProps<Value, Action, Result>,
	onMount?: OnMount,
) {
	return new ReducerStore(props, onMount)
}

export class ReducerStore<Value, Action, Result> extends Subscribed<
	Result,
	[Action],
	void
> {
	private init
	private reduce
	private result
	private onChange
	private dirty = false
	protected value: Value = undefined as never
	private res: Result = undefined as never
	constructor(props: ReducerProps<Value, Action, Result>, onMount?: OnMount) {
		super(onMount)
		this.init = props.init
		this.reduce = props.reduce
		this.result = props.result ?? (id as never)
		this.onChange = props.onChange
	}
	private makeDirty() {
		if (this.dirty) return
		this.dirty = true
		this.value = fromInit(this.init)
		this.res = this.result(this.value)
	}
	send(arg: Action) {
		this.makeDirty()
		const nextValue = this.reduce(arg, this.value)
		if (Object.is(nextValue, this.value)) return
		this.onChange?.(nextValue, this.value)
		this.value = nextValue
		const nextRes = this.result(nextValue)
		if (Object.is(nextRes, this.res)) return
		this.res = nextRes
		this.notify()
	}
	peek() {
		this.makeDirty()
		return this.res
	}
}
