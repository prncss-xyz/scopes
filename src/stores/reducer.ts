import type { OnMount } from '../family'
import { fromInit, id, setState, type Init } from '../functions'
import { Subscribed } from './subscribed'

type ReducerProps<Value, Action, Result> = {
	init: Init<Value>
	reduce: (action: Action, last: Value) => Value
	result: (value: Value) => Result
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

export function reducer<Props, Value, Action, Result>(
	r: Reducer<Props, Value, Action, Result>,
) {
	return (props: Props, onMount?: OnMount) => {
		return new ReducerStore(r(props), onMount)
	}
}

class ReducerStore<Value, Action, Result> extends Subscribed<
	Result,
	[Action],
	void
> {
	private init: Init<Value>
	private reduce: (action: Action, last: Value) => Value
	private result: (value: Value) => Result
	private dirty = false
	private value: Value = undefined as any
	private res: Result = undefined as any
	constructor(props: ReducerProps<Value, Action, Result>, onMount?: OnMount) {
		super(onMount)
		this.init = props.init
		this.reduce = props.reduce
		this.result = props.result
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
