import { cached } from './cached'
import { Store } from './store'

type ReducerProps<Value, Action, Result> = {
	init: Value
	reduce: (action: Action, last: Value) => Value
	result: (value: Value) => Result
}

export type Reducer<Params extends any[], Value, Action, Result> = (
	...params: Params
) => ReducerProps<Value, Action, Result>

export function createReducer<Params extends any[], Value, Action, Result>(
	reducer: Reducer<Params[], Value, Action, Result>,
	onMount?: () => (() => void) | void,
) {
	return function (...params: Params) {
		let dirty = false
		let value: Value
		let reduce: (action: Action, last: Value) => Value
		let result: (value: Value) => Result
		let res: Result
		function makeDirty() {
			if (dirty) return
			dirty = true
			;({ init: value, reduce, result } = reducer(...params))
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
}

export function createScopedStore<Keys extends any[], Value, Action, Result>(
	reducer: Reducer<Keys, Value, Action, Result>,
	ttl: number = 1000 * 60 * 5,
) {
	return cached(
		(mount, ...keys: Keys) => createReducer(reducer, mount)(...keys),
		ttl,
	)
}
