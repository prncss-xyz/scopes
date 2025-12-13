// TODO: hydrate
// TODO: cancel pending queries

// default staleTime 0 ms
// default ttl 5 * 60 * 1000 ms

import { exhaustive, isFunction, type SetState } from '../../functions'

type State<Data> = (
	| {
			type: 'pending' | 'disabled' | 'error'
	  }
	| {
			type: 'success'
			payload: {
				data: Data
				since: number
			}
	  }
) & {
	mounted: boolean
	fetching: boolean
}

type Event<Data> =
	| {
			type: 'reset' | 'invalidate' | 'prefetch' | 'enable'
	  }
	| { type: 'update'; payload: SetState<Data> }
	| {
			type: '_onMount'
			payload:
				| {
						type: 'mount'
						payload: number
				  }
				| { type: 'unmount' }
	  }
	| {
			type: '_fetch'
			payload:
				| {
						type: 'success'
						payload: {
							data: Data
							since: number
						}
				  }
				| {
						type: 'error'
				  }
	  }

export function queryMachine<Data>({ staleTime }: { staleTime?: number }) {
	const reset: State<Data> = {
		type: 'pending',
		fetching: false,
		mounted: false,
	}
	function init() {
		return reset
	}
	function reduce(event: Event<Data>, state: State<Data>): State<Data> {
		switch (event.type) {
			case 'update':
				if (isFunction(event.payload)) {
					if (state.type === 'success') {
						const data = event.payload(state.payload.data)
						if (!Object.is(data, state.payload.data)) {
							return { ...state, payload: { ...state.payload, data } }
						}
					}
					return state
				}
				return {
					...state,
					type: 'success',
					payload: { data: event.payload, since: -Infinity },
				}
			case 'enable':
				if (state.type === 'disabled')
					return { ...state, type: 'pending', fetching: state.mounted }
				return state
			case 'prefetch':
				if (state.type === 'pending' || state.type === 'disabled')
					return { ...state, fetching: true }
				return state
			case 'invalidate':
				if (state.type === 'success') {
					if (state.mounted) return { ...state, fetching: true }
					return { ...state, payload: { ...state.payload, since: -Infinity } }
				}
				return state
			case 'reset':
				return {
					type: 'pending',
					fetching: state.mounted,
					mounted: state.mounted,
				}
			case '_fetch':
				return { ...event.payload, mounted: state.mounted, fetching: false }
			case '_onMount':
				if (
					state.type === 'success' &&
					event.payload.type === 'mount' &&
					event.payload.payload - state.payload.since > (staleTime ?? 0)
				)
					return { ...state, fetching: true, mounted: true }
				return { ...state, mounted: event.payload.type === 'mount' }
			default:
				return exhaustive(event)
		}
	}
	return {
		init,
		reduce,
		effects: {
			_fetch: ({ fetching }: State<Data>) =>fetching,
		},
	}
}
