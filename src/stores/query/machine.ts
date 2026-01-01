import { exhaustive, type Modify } from '../../functions'
import type { Tags } from '../../tags/types'

export type State<Data> = Tags<{
	pending: void
	error: unknown
	success: { data: Data; since: number }
}> & { mounted: boolean; fetching: boolean }

export type EventIn<Data> = Tags<{
	reset: void
	invalidate: void
	prefetch: void
	abort: void
	_unmount: void
	delete: void
	update: Modify<Data>
	focus: number
	_mount: number
	success: { data: Data; since: number }
	error: unknown
}>

export type EventOut<Data> = Tags<{
	fetch: void
	abort: void
	delete: void
	data: { next: Data | undefined; last: Data | undefined }
}>

function shouldFetch<Data>(state: State<Data>, event: { payload: number }) {
	return !(state.type === 'success' && event.payload < state.payload.since)
}

export function queryMachine<Data>() {
	function init(): State<Data> {
		return {
			type: 'pending',
			fetching: false,
			mounted: false,
		}
	}
	function reduce0(
		event: EventIn<Data>,
		state: State<Data>,
		act: (action: EventOut<Data>) => void,
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
			case 'focus':
				return {
					...state,
					fetching: shouldFetch(state, event),
				}
			case '_mount':
				return {
					...state,
					fetching: shouldFetch(state, event),
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
		act: (action: EventOut<Data>) => void,
	) {
		if (next.fetching !== last.fetching)
			act({ type: next.fetching ? 'fetch' : 'abort' })

		const lastData = last.type === 'success' ? last.payload.data : undefined
		const nextData = next.type === 'success' ? next.payload.data : undefined
		if (!Object.is(nextData, lastData))
			act({ type: 'data', payload: { next: nextData, last: lastData } })
	}
	function reduce(
		event: EventIn<Data>,
		state: State<Data>,
		act: (action: EventOut<Data>) => void,
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
