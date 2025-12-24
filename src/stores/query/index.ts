import { collection } from '../../collection'
import { queryMachine, type State, type Event } from './machine'
import { reducer } from '../reducer'
import { exhaustive, type Init, type Reset } from '../../functions'
import { globalFetchingStore } from './globalFetching'
import { Observable } from '../observable'
import { suspended } from './suspended'
import { primitiveWithOnPeek } from './primitiveWithOnPeek'
import type { OnMount } from '../../mount'

const defaultTTL = 5 * 60 * 1000
const defaultStaleTime = 0

// FEAT: sync equivalent
// FEAT: prefetch on creation; action to delete single entry
// REFACT: move promise to Suspend
// FEAT: deep merge

export interface StorageProps<Props, Data> {
	get?: (props: Props, signal: AbortSignal) => Promise<Data>
	set?: (props: Props, value: Data) => void
	del?: (props: Props) => Data
	onError?: (props: Props, error: unknown) => void
	observe?: (emit: (props: Props, value: Data) => void) => () => void
}

export type QueryProps<Props, Data> = {
	ttl?: number
	staleTime?: number
	api: StorageProps<Props, Data>
}

function primitive<Data>(
	action: () => void,
	init: Init<State<Data>>,
	onMount?: OnMount,
) {
	return primitiveWithOnPeek(
		init,
		(state) => state.type === 'pending' && !state.fetching,
		action,
		onMount,
	)
}

function createReducer<Props, Data>(
	{ api, staleTime }: QueryProps<Props, Data>,
	props: Props,
	observable: Observable<
		[props: Props, next: Data | Reset, last: Data | Reset]
	>,
	payload?: {
		data: Data
		since: number
	},
) {
	let contoller: AbortController
	const get = reducer(
		{
			reducer: queryMachine<Data>(),
			createStore: (init, onMount) => {
				return primitive(
					() => get.send({ type: 'prefetch' }),
					payload
						? {
								type: 'success',
								payload,
								fetching: false,
								mounted: false,
							}
						: init,
					onMount,
				)
			},
			act: (action, send) => {
				switch (action.type) {
					case 'abort':
						if (!contoller) return
						contoller.abort()
						globalFetchingStore.send(-1)
					case 'fetch':
						globalFetchingStore.send(1)
						contoller = new AbortController()
						api
							.get?.(props, contoller.signal)
							.then((data) => {
								if (contoller.signal.aborted) return
								globalFetchingStore.send(-1)
								api.set?.(props, data)
								send({
									type: 'success',
									payload: { data, since: Date.now() },
								})
							})
							.catch((payload) => {
								if (contoller.signal.aborted) return
								globalFetchingStore.send(-1)
								send({ type: 'error', payload })
								api.onError?.(props, payload)
							})
						return
					case 'data':
						observable.emit(props, action.payload.next, action.payload.last)
						return
					case 'delete':
						if (!api.del) return
						send({
							type: 'success',
							payload: { data: api.del(props), since: Date.now() },
						})
						return
					default:
						exhaustive(action)
				}
			},
		},
		(send) => {
			send({
				type: '_mount',
				payload: Date.now() - (staleTime ?? defaultStaleTime),
			})
			return () => send({ type: '_unmount' })
		},
	)
	return get
}

const sendQueriesCallbacks: ((
	filter: (props: unknown) => boolean,
	event: Event<never>,
) => void)[] = []

export function sendQueries(
	filter: (props: unknown) => boolean,
	event: Event<never>, // TODO: actually remove update and success events
) {
	sendQueriesCallbacks.forEach((callback) => callback(filter, event))
}

export function query<Props, Data>(
	queryProps: QueryProps<Props, Data>,
	hydrate?: Iterable<[Props, { data: Data; since: number }]>,
) {
	const observable = new Observable<
		[props: Props, next: Data | Reset, last: Data | Reset]
	>()
	const c = collection(
		(props: Props) => createReducer(queryProps, props, observable),
		{
			ttl: queryProps.ttl ?? defaultTTL,
			hydrate: hydrate
				? {
						values: hydrate,
						decode: (payload, props) =>
							createReducer(queryProps, props, observable, payload),
					}
				: undefined,
			onMount: queryProps.api.observe
				? () =>
						queryProps.api.observe!((p, data) =>
							c.get(p).send({
								type: 'success',
								payload: { data, since: Date.now() },
							}),
						)
				: undefined,
		},
	)
	function send(filter: (props: Props) => boolean, event: Event<Data>) {
		c.forEach((key, store) => filter(key) && store.send(event))
	}
	sendQueriesCallbacks.push(send as any)
	return {
		get: (props: Props) => c.get(props),
		suspend: (props: Props) => suspended(c.get(props)),
		observe: observable.observe.bind(observable),
		send,
	}
}
