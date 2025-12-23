import { exhaustive, RESET, type Modify, type Reset } from '../../functions'

export type State<Data> = (
	| {
			type: 'pending'
			payload: {
				resolve: (data: Data) => void
				reject: (error: unknown) => void
				promise: Promise<Data>
			}
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
				promise: Promise<Data>
			}
	  }
) & {
	mounted: boolean
	fetching: boolean
}

export type Event<Data> =
	| {
			type: 'reset' | 'invalidate' | 'prefetch' | 'cancel' | 'unmount'
	  }
	| { type: 'update'; payload: Modify<Data> }
	| {
			type: 'mount'
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
				next: Data | Reset
				last: Data | Reset
			}
	  }
	| { type: 'fetch' | 'cancel' }

export function queryMachine<Data>() {
	function init(): State<Data> {
		return {
			type: 'pending',
			fetching: false,
			mounted: false,
			payload: Promise.withResolvers<Data>(),
		}
	}
	function reduce0(event: Event<Data>, state: State<Data>): State<Data> {
		switch (event.type) {
			case 'cancel':
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
					payload: Promise.withResolvers<Data>(),
				}
			case 'success':
				const promise =
					state.type === 'pending'
						? state.payload.promise
						: Promise.resolve(event.payload.data)
				return {
					type: 'success',
					payload: { ...event.payload, promise },
					mounted: state.mounted,
					fetching: false,
				}
			case 'error':
				return { ...event, mounted: state.mounted, fetching: false }
			case 'mount':
				return {
					...state,
					fetching: !(
						state.type === 'success' && event.payload < state.payload.since
					),
					mounted: true,
				}
			case 'unmount':
				return { ...state, mounted: false }
			default:
				return exhaustive(event)
		}
	}
	function reduce(
		event: Event<Data>,
		last: State<Data>,
		act: (action: Action<Data>) => void,
	) {
		const next = reduce0(event, last)
		if (next.fetching && !last.fetching) act({ type: 'fetch' })
		if (next.type === 'success' && last.type === 'pending')
			last.payload.resolve(next.payload.data)
		if (next.type === 'error' && last.type === 'pending')
			last.payload.reject(next.payload)
		const lastData = last.type === 'success' ? last.payload.data : RESET
		const nextData = next.type === 'success' ? next.payload.data : RESET
		if (!Object.is(nextData, lastData)) {
			act({ type: 'data', payload: { next: nextData, last: lastData } })
		}
		return next
	}
	return {
		init,
		reduce,
	}
}
