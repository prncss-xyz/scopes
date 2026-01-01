import { exhaustive } from '../../functions'
import type { Tags } from '../../tags/types'
import { tag } from '../../tags/tag'

export type State = Tags<{
	idle: void
	pending: void
	success: void
	error: unknown
}>

export type EventIn<Props, Data> = Tags<{
	abort: void
	_success: void
	_error: unknown
	mutate:
		| {
				onSuccess?: (data: Data, props: Props) => void
				onError?: (error: unknown, props: Props) => void
		  }
		| undefined
}>

export type EventOut<Props, Data> = Tags<{
	mutate: {
		onSuccess?: (data: Data, props: Props) => void
		onError?: (error: unknown, props: Props) => void
	}
	abort: void
}>

export function mutationMachine<Props, Data>() {
	function init(): State {
		return {
			type: 'idle',
		}
	}
	function reduce(
		event: EventIn<Props, Data>,
		state: State,
		act: (action: EventOut<Props, Data>) => void,
	): State {
		switch (event.type) {
			case 'mutate':
				if (state.type === 'pending') return state
				act(tag('mutate', event.payload ?? {}))
				return tag('pending')
			case '_error':
				return tag('error', event.payload)
			case '_success':
				return tag('success')
			case 'abort':
				if (state.type !== 'pending') return state
				act(tag('abort'))
				return tag('idle')
			default:
				return exhaustive(event)
		}
	}
	return {
		init,
		reduce,
	}
}
