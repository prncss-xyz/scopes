import type { OnMount } from '../family'
import { fromInit, id, setState, type Init } from '../functions'
import { Store } from './store'

type ReducerProps<Value, Action, Result> = {
	init: Init<Value>
	reduce: (action: Action, last: Value) => Value
	result: (value: Value) => Result
}

export type Reducer<Props, Value, Action, Result> = (
	props: Props,
) => ReducerProps<Value, Action, Result>

export function state<Value>(init: Init<Value>, onMount?: OnMount) {
	return reducer(
		{
			init,
			reduce: setState<Value>,
			result: id,
		},
		onMount,
	)
}

export function reducer<Value, Action, Result>(
	reducer: ReducerProps<Value, Action, Result>,
	onMount?: OnMount,
) {
	let dirty = false
	let value: Value
	let reduce: (action: Action, last: Value) => Value
	let result: (value: Value) => Result
	let res: Result
	function makeDirty() {
		if (dirty) return
		dirty = true
		;({ reduce, result } = reducer)
		value = fromInit(reducer.init)
		res = result(value)
	}
	const subscribers = new Set<() => void>()
	let unmount: (() => void) | void = undefined
	return new Store<Result, [Action], void>(
		(action: Action) => {
			makeDirty()
			const last = value
			value = reduce(action, value)
			if (Object.is(value, last)) return
			const nextRes = result(value)
			res = nextRes
			subscribers.forEach((fn) => fn())
		},
		(cb: () => void) => {
			if (subscribers.size === 0) unmount = onMount?.()
			subscribers.add(cb)
			return () => {
				subscribers.delete(cb)
				if (subscribers.size > 0) return
				unmount?.()
			}
		},
		() => {
			makeDirty()
			return res
		},
	)
}
