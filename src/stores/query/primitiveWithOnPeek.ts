import { type Init } from '../../functions'
import type { OnMount } from '../../mount'
import { PrimitiveStore } from '../primitive'

export function primitiveWithOnPeek<Value>(
	init: Init<Value>,
	filter: (value: Value) => boolean,
	action: () => void,
	onMount?: OnMount,
) {
	return new PrimitiveWithOnPeek(init, filter, action, onMount)
}

export class PrimitiveWithOnPeek<Value> extends PrimitiveStore<Value> {
	#filter
	#action
	constructor(
		init: Init<Value>,
		filter: (value: Value) => boolean,
		action: () => void,
		onMount?: OnMount,
	) {
		super(init, onMount)
		this.#filter = filter
		this.#action = action
	}
	peek() {
		const value = super.peek()
		if (this.#filter(value)) Promise.resolve().then(this.#action.bind(this))
		return value
	}
}
