import { exhaustive, type Modify } from '../../functions'

export type State<Data> = (
	| {
			type: 'pending'
	  }
	| {
			type: 'error'
			payload: unknown
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

export type Event<Data> =
	| {
			type:
				| 'reset'
				| 'invalidate'
				| 'prefetch'
				| 'abort'
				| '_unmount'
				| 'delete'
	  }
	| { type: 'update'; payload: Modify<Data> }
	| {
			type: '_mount'
			payload: number
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
			payload: unknown
	  }

export type Action<Data> =
	| {
			type: 'data'
			payload: {
				next: Data | undefined
				last: Data | undefined
			}
	  }
	| { type: 'fetch' | 'abort' | 'delete' }

export function queryMachine<Data>() {
	function init(): State<Data> {
		return {
			type: 'pending',
			fetching: false,
			mounted: false,
		}
	}
	function reduce0(
		event: Event<Data>,
		state: State<Data>,
		act: (action: Action<Data>) => void,
	): State<Data> {
		switch (event.type) {
			case 'abort':
				if (state.mounted) return state
				return { ...state, fetching: false }
			case 'update':
				if (state.type === 'success') {
					const data = event.payload(state.payload.data)
					if (Object.is(data, state.payload.data)) return state
					return { ...state, payload: { ...state.payload, data } }
				}
				return state
			case 'prefetch':
				if (state.type === 'pending') return { ...state, fetching: true }
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
			case 'success':
				return {
					type: 'success',
					payload: event.payload,
					mounted: state.mounted,
					fetching: false,
				}
			case 'error':
				return { ...event, mounted: state.mounted, fetching: false }
			case '_mount':
				return {
					...state,
					fetching: !(
						state.type === 'success' && event.payload < state.payload.since
					),
					mounted: true,
				}
			case '_unmount':
				return { ...state, mounted: false, fetching: false }
			case 'delete':
				act({ type: 'delete' })
				return state
			default:
				return exhaustive(event)
		}
	}
	function react(
		next: State<Data>,
		last: State<Data>,
		act: (action: Action<Data>) => void,
	) {
		if (next.fetching !== last.fetching)
			act({ type: next.fetching ? 'fetch' : 'abort' })

		const lastData = last.type === 'success' ? last.payload.data : undefined
		const nextData = next.type === 'success' ? next.payload.data : undefined
		if (!Object.is(nextData, lastData))
			act({ type: 'data', payload: { next: nextData, last: lastData } })
	}
	function reduce(
		event: Event<Data>,
		state: State<Data>,
		act: (action: Action<Data>) => void,
	): State<Data> {
		const next = reduce0(event, state, act)
		react(next, state, act)
		return next
	}
	return {
		init,
		reduce,
	}
}
