import { fromInit, setState, type Init, type SetState } from '../functions'
import { Store } from './store'

export const constant = ref as <Value>(
	init: Init<Value>,
	onMount?: () => (() => void) | void,
) => Store<Value, [never], void>

export function ref<Value>(
	init: Init<Value>,
	onMount?: () => (() => void) | void,
) {
	let value: Value
	let count = 0
	let unmount: (() => void) | void = undefined
	let dirty = false
	function makeDirty() {
		if (dirty) return
		dirty = true
		value = fromInit(init)
	}
	return new Store<Value, [SetState<Value>], void>(
		(next) => {
			makeDirty()
			value = setState(next, value)
		},
		() => {
			if (count === 0) unmount = onMount?.()
			count++
			return () => {
				count--
				if (count === 0) unmount?.()
			}
		},
		() => {
			makeDirty()
			return value
		},
	)
}
