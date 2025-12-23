import { exhaustive } from '../../functions'

export type State =
	| { type: 'idle' | 'pending' | 'success' }
	| { type: 'error'; payload: unknown }

export type Event<Props> =
	| {
			type: 'cancel' | 'success'
	  }
	| { type: 'error'; payload: unknown }
	| { type: 'mutate'; payload: Props }

export type Action<Props> =
	| {
			type: 'mutate'
			payload: Props
	  }
	| { type: 'cancel' }

export function mutationMachine<Props>() {
	function init(): State {
		return {
			type: 'idle',
		}
	}
	function reduce(
		event: Event<Props>,
		state: State,
		act: (action: Action<Props>) => void,
	): State {
		switch (event.type) {
			case 'mutate':
				if (state.type === 'pending') return state
				act({ type: 'mutate', payload: event.payload })
				return { type: 'pending' }
			case 'error':
				return { type: 'error', payload: event.payload }
			case 'success':
				return { type: 'success' }
			case 'cancel':
				if (state.type !== 'pending') return state
				act({ type: 'cancel' })
				return { ...state, type: 'idle' }
			default:
				return exhaustive(event)
		}
	}
	return {
		init,
		reduce,
	}
}
