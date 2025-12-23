import {
	fromInit,
	isReset,
	setState,
	type Init,
	type SetState,
} from '../functions'
import type { OnMount } from '../mount'
import { Store } from './store'
import { Counted } from './subscribed'

class Ref<Value> extends Counted<Value, [SetState<Value>], void> {
	#init
	#value: Value = undefined as any
	#dirty = false
	constructor(init: Init<Value>, onMount?: OnMount) {
		super(onMount)
		this.#init = init
	}
	private makeDirty() {
		if (this.#dirty) return
		this.#dirty = true
		this.#value = fromInit(this.#init)
	}
	send(arg: SetState<Value>) {
		if (isReset(arg)) {
			this.#dirty = false
			return
		}
		this.makeDirty()
		this.#value = setState(arg, this.#value)
	}
	peek() {
		this.makeDirty()
		return this.#value
	}
}

export function ref<Value>(init: Init<Value>, onMount?: OnMount) {
	return new Ref(init, onMount)
}

export function constant<Value>(
	init: Init<Value>,
	onMount?: OnMount,
): Store<Value, [never], void> {
	return new Ref(init, onMount)
}
