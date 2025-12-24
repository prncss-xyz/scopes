import { collection } from '../../collection'
import { queryMachine, type Action, type State, type Event } from './machine'
import { reducer, ReducerStore } from '../reducer'
import { exhaustive, type Reset } from '../../functions'
import { Suspended, suspended } from './suspended'
import { primitive } from '../primitive'
import { globalFetchingStore } from './globalFetching'
import { Observable } from '../observable'

const defaultTTL = 5 * 60 * 1000
const defaultStaleTime = 0

// FIXME: reset when already reset
// REFACT: move promise to Suspend
// FEAT: better abort logic
// FEAT: deep merge
// FEAT: sync equivalent
// FEAT: derived: promises
// FEAT: user send function: replace del action, add now to success
// FEAT: ssr

function createReducer<Props, Data, Suspend>(
	{ api, staleTime, suspend }: QueryProps<Props, Data, Suspend>,
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
						if (suspend) return
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
								r.send({
									type: 'success',
									payload: { data, since: Date.now() },
								})
							})
							.catch((payload) => {
								if (contoller.signal.aborted) return
								globalFetchingStore.send(-1)
								r.send({ type: 'error', payload })
								api.onError?.(props, payload)
							})
						return
					case 'data':
						observable.emit(props, action.payload.next, action.payload.last)
						return
					case 'delete':
						if (!api.del) return
						r.send({
							type: 'success',
							payload: { data: api.del(props), since: Date.now() },
						})
						return
					default:
						exhaustive(action)
				}
			},
		},
		() => {
			r.send({
				type: 'mount',
				payload: Date.now() - (staleTime ?? defaultStaleTime),
			})
			return () => r.send({ type: 'unmount' })
		},
	)
	return (suspend ? suspended(r) : r) as any
}

export interface StorageProps<Props, Data> {
	get?: (props: Props, signal: AbortSignal) => Promise<Data>
	set?: (props: Props, value: Data) => void
	del?: (props: Props) => Data
	onError?: (props: Props, error: unknown) => void
	observe?: (emit: (props: Props, value: Data) => void) => () => void
}

export type QueryProps<Props, Data, Suspend = true> = {
	ttl?: number
	staleTime?: number
	api: StorageProps<Props, Data>
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
	const get = collection(
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
							get(p).send({
								type: 'success',
								payload: { data, since: Date.now() },
							}),
						)
				: undefined,
		},
	)
	return {
		get,
		observe: observable.observe.bind(observable),
	}
}
