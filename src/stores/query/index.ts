import { collection } from '../../collection'
import { queryMachine, type Action, type State, type Event } from './machine'
import { reducer, ReducerStore } from '../reducer'
import { exhaustive, type Reset } from '../../functions'
import { composeMount, type OnMount } from '../../mount'
import { Observable } from '../subscribed'
import { Suspended, suspended } from './suspended'
import { primitive } from '../primitive'

const defaultTTL = 5 * 60 * 1000
const defaultStaleTime = 0

// TODO: global fetching indicator
// TODO: deep merge
// TODO: sync equivalent
// TODO: derived: promises
// TODO: user send function: replace del action, add now to success

function createReducer<Props, Data, Suspend>(
	query: QueryProps<Props, Data, Suspend>,
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
	const r = reducer(
		{
			reducer: queryMachine<Data>(),
			createStore: (init, onMount) => {
				if (payload) {
					return primitive<State<Data>>(
						{
							type: 'success',
							payload,
							fetching: false,
							mounted: false,
						},
						onMount,
					)
				}
				return primitive(init, onMount)
			},
			act: (action) => {
				switch (action.type) {
					case 'abort':
						if (query.suspend) return
						contoller?.abort()
					case 'fetch':
						contoller = new AbortController()
						query.api
							.get?.(props, contoller.signal)
							.then((data) => {
								if (contoller.signal.aborted) return
								query.api.set?.(props, data)
								r.send({
									type: 'success',
									payload: { data, since: Date.now() },
								})
							})
							.catch((payload) => {
								if (contoller.signal.aborted) return
								r.send({ type: 'error', payload })
								query.onError?.(payload)
							})
						return
					case 'data':
						observable.emit(props, action.payload.next, action.payload.last)
						return
					case 'delete':
						if (!query.api.del) return
						r.send({
							type: 'success',
							payload: { data: query.api.del(props), since: Date.now() },
						})
						return
					default:
						exhaustive(action)
				}
			},
		},
		composeMount(query.onMount, () => {
			r.send({
				type: 'mount',
				payload: Date.now() - (query.staleTime ?? defaultStaleTime),
			})
			return () => r.send({ type: 'unmount' })
		}),
	)
	return (query.suspend ? suspended(r) : r) as any
}

export interface StorageProps<Props, Data> {
	get?: (props: Props, signal: AbortSignal) => Promise<Data>
	set?: (props: Props, value: Data) => void
	del?: (props: Props) => Data
	observe?: (emit: (props: Props, value: Data) => void) => () => void
}

export type QueryProps<Props, Data, Suspend = true> = {
	ttl?: number
	staleTime?: number
	api: StorageProps<Props, Data>
	onMount?: OnMount
	onError?: (error: unknown) => void
	suspend?: Suspend
}

export function query<Props, Data>(
	props: QueryProps<Props, Data, true>,
	hydrate?: Iterable<[Props, { data: Data; since: number }]>,
): {
	get: (key: Props) => Suspended<Data>
	observe: (
		cb: (props: Props, next: Data | Reset, last: Data | Reset) => void,
	) => () => boolean
}
export function query<Props, Data>(
	props: QueryProps<Props, Data, false>,
	hydrate?: Iterable<[Props, { data: Data; since: number }]>,
): {
	get: (
		key: Props,
	) => ReducerStore<State<Data>, Event<Data>, State<Data>, Action<Data>>
	observe: (
		cb: (props: Props, next: Data | Reset, last: Data | Reset) => void,
	) => () => boolean
}
export function query<Props, Data, Suspend = true>(
	queryProps: QueryProps<Props, Data, Suspend>,
	hydrate?: Iterable<[Props, { data: Data; since: number }]>,
) {
	queryProps.suspend ??= true as never
	const observable = new Observable<
		[props: Props, next: Data | Reset, last: Data | Reset]
	>()
	const raw = collection(
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
			onMount: composeMount(
				queryProps.onMount,
				queryProps.api.observe
					? () =>
							queryProps.api.observe!((p, data) =>
								raw(p).send({
									type: 'success',
									payload: { data, since: Date.now() },
								}),
							)
					: undefined,
			),
		},
	)
	return {
		get: raw,
		observe: observable.observe.bind(observable),
	}
}
