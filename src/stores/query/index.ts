import { collection } from '../../collection'
import { queryMachine, type State, type Event } from './machine'
import { reducer } from '../reducer'
import { exhaustive, isReset, type Reset } from '../../functions'
import { globalFetchingStore } from './globalFetching'
import { Observable } from '../observable'
import { primitive } from '../primitive'
import { mappedStore } from '../mapped'

const defaultTTL = 5 * 60 * 1000
const defaultStaleTime = 0

// FEAT: sync equivalent
// FEAT: deep merge
// TODO: make suspend fail on cancelation

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

function createQueryReducer<Props, Data>(
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
	let resolvers: ReturnType<typeof Promise.withResolvers<Data>> | undefined
	const base = reducer(
		{
			reducer: queryMachine<Data>(),
			createStore: (init, onMount) => {
				return primitive<State<Data>>(
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
            // TODO: is it the right behavior here?
						resolvers?.reject(new Error('aborted'))
						return
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
								if (resolvers) {
									resolvers.reject(payload)
									resolvers = undefined
								}
								send({ type: 'error', payload })
								api.onError?.(props, payload)
							})
						return
					case 'data':
						if (!isReset(action.payload.next) && resolvers) {
							resolvers.resolve(action.payload.next)
							resolvers = undefined
						}
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
	const suspend = mappedStore(base, (state) => {
		switch (state.type) {
			case 'success':
				return state.payload.data
			case 'error':
				throw state.payload
			case 'pending':
				if (!resolvers) {
					resolvers = Promise.withResolvers<Data>()
					Promise.resolve().then(() => base.send({ type: 'prefetch' }))
				}
				return resolvers.promise
			default:
				return exhaustive(state)
		}
	})
	return { base, suspend }
}

const sendQueriesCallbacks: ((
	filter: (props: unknown) => boolean,
	event: Event<any>,
) => void)[] = []

export function sendQueries(
	filter: (props: unknown) => boolean,
	event: Event<any> & { type: Exclude<string, 'update' | 'success'> },
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
		(props: Props) => createQueryReducer(queryProps, props, observable),
		{
			ttl: queryProps.ttl ?? defaultTTL,
			hydrate: hydrate
				? {
						values: hydrate,
						decode: (payload, props) =>
							createQueryReducer(queryProps, props, observable, payload),
					}
				: undefined,
			onMount: queryProps.api.observe
				? () =>
						queryProps.api.observe!((p, data) =>
							c.get(p).base.send({
								type: 'success',
								payload: { data, since: Date.now() },
							}),
						)
				: undefined,
		},
	)
	function sendQuery(filter: (props: Props) => boolean, event: Event<Data>) {
		c.forEach((key, store) => filter(key) && store.base.send(event))
	}
	sendQueriesCallbacks.push(sendQuery)
	return {
		base: (props: Props) => c.get(props).base,
		suspend: (props: Props) => c.get(props).suspend,
		observe: observable.observe.bind(observable),
		sendQuery,
	}
}
