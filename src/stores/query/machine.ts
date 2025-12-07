// TODO: idle/disable
// TODO: hydrate
// TODO: cancel pending queries

// default staleTime 0 ms
// default ttl 5 * 60 * 1000 ms

import { assertion } from '../../assertion'
import { exhaustive } from '../../functions'

type State<Data> = (
	| {
			type: 'pending'
	  }
	| {
			type: 'success'
			payload: {
				data: Data
				since: number
			}
	  }
	| {
			type: 'error'
			fetching: false
	  }
) & {
	mounted: boolean
	fetching: boolean
}

type Event<Data> =
	| {
			type: 'reset' | 'unmount' | 'fetch'
	  }
	| {
			type: 'mount'
			now: number
	  }
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

type Action = 'fetch'

export function getReducer<Data>({
	staleTime,
	act,
}: {
	staleTime: number
	act: (action: Action) => void
}) {
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
			case 'unmount':
				assertion(state.mounted)
				return { ...state, mounted: false }
			case 'reset':
				if (state.mounted && !state.fetching) {
					act('fetch')
					return { type: 'pending', fetching: true, mounted: true }
				}
				return { type: 'pending', fetching: false, mounted: state.mounted }
		}
		switch (state.type) {
			case 'error':
				switch (event.type) {
					case 'success':
					case 'error':
						throw new Error('unexpected event')
					case 'mount':
						return { ...state, mounted: true }
					default:
						return state
				}
			case 'pending':
				switch (event.type) {
					case 'fetch':
						if (!state.fetching) act('fetch')
						return { type: 'pending', fetching: true, mounted: state.mounted }
					case 'success':
						return {
							type: 'success',
							payload: event.payload,
							mounted: state.mounted,
							fetching: false,
						}
					case 'error':
						return { type: 'error', fetching: false, mounted: state.mounted }
					case 'mount':
						assertion(!state.mounted)
						return { ...state, mounted: true }
					default:
						return state
				}
			case 'success':
				switch (event.type) {
					case 'success':
					case 'error':
						throw new Error('unexpected event')
					case 'fetch':
						if (!state.fetching) act('fetch')
						return { ...state, fetching: true }
					case 'mount':
						if (
							event.now - state.payload.since > staleTime &&
							state.fetching === false
						) {
							act('fetch')
							return { ...state, fetching: true, mounted: true }
						}
						assertion(!state.mounted)
						return { ...state, mounted: true }
					default:
						return state
				}
			default:
				return exhaustive(state)
		}
	}
	return { init, reduce }
}
