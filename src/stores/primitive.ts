import {
	fromInit,
	isFunction,
	isReset,
	type Init,
	type SetStateWithReset,
} from '../functions'
import type { OnMount } from '../mount'
import { Subscribed } from './subscribed'

export type ValueStore<Value> = Subscribed<Value, [Value], void>

export function primitive<Value>(init: Init<Value>, onMount?: OnMount) {
	return new PrimitiveStore(init, onMount)
}

export class PrimitiveStore<Value>
	extends Subscribed<Value, [SetStateWithReset<Value>], void>
	implements ValueStore<Value>
{
	#init
	#dirty = false
	#value: Value = undefined as never
	constructor(init: Init<Value>, onMount?: OnMount) {
		super(onMount)
		this.#init = init
	}
	#makeDirty() {
		if (this.#dirty) return
		this.#dirty = true
		this.#value = fromInit(this.#init)
	}
	send(arg: SetStateWithReset<Value>) {
		if (isReset(arg)) {
			if (!this.#dirty) return
			this.#dirty = true
			this.notify()
			return
		}
		let nextValue: Value
		if (isFunction(arg)) {
			this.#makeDirty()
			nextValue = arg(this.#value)
		} else {
			this.#dirty = true
			nextValue = arg
		}
		if (Object.is(nextValue, this.#value)) return
		this.#value = nextValue
		this.notify()
	}
	peek() {
		this.#makeDirty()
		return this.#value
	}
}
