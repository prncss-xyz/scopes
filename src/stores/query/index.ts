import { collection } from '../../collection'
import { queryMachine, type State } from './machine'
import { reducer } from '../reducer'
import { exhaustive, type Reset } from '../../functions'
import { primitive } from '../primitive'
import { globalFetchingStore } from './globalFetching'
import { Observable } from '../observable'
import { suspended } from './suspended'

const defaultTTL = 5 * 60 * 1000
const defaultStaleTime = 0

// FEAT: global actions
// FEAT: improve API, user send function: replace del action, add now to success
// FEAT: sync equivalent
// FEAT: deep merge
// REFACT: move promise to Suspend

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
	return r
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
	return {
		get: (props: Props) => c.get(props),
		suspend: (props: Props) => suspended(c.get(props)),
		observe: observable.observe.bind(observable),
	}
}
