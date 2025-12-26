import { collection } from '../../collection'
import { queryMachine, type State, type EventIn } from './machine'
import { reducer, type Public } from '../reducer'
import { exhaustive } from '../../functions'
import { Observable } from '../observable'
import { primitive } from '../primitive'
import { mappedStore } from '../mapped'
import { createReport } from '../createReport'

const defaultTTL = 5 * 60 * 1000
const defaultStaleTime = 0

export const globalFetchingStore = createReport()

// FEAT: sync equivalent
// FEAT: deep merge
// TODO: make suspend fail on cancelation
// TODO: sendable reducer

export interface StorageProps<Props, Data> {
	get?: (props: Props, signal: AbortSignal) => Promise<Data>
	// TODO: revert on fail?
	set?: (props: Props, value: Data) => void
	// TODO: revert on fail?
	del?: (props: Props) => Data
	onError?: (props: Props, error: unknown) => void
	observe?: (emit: (props: Props, value: Data) => void) => () => void
}

export type QueryProps<Props, Data> = {
	ttl?: number
	staleTime?: number
	api: StorageProps<Props, Data>
}

function oneQuery<Props, Data>(
	{ api, staleTime }: QueryProps<Props, Data>,
	props: Props,
	observable: Observable<
		[props: Props, next: Data | undefined, last: Data | undefined]
	>,
	report: (delta: number) => void,
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
			onSend: (action, send) => {
				switch (action.type) {
					case 'abort':
						if (!contoller) return
						contoller.abort()
						report(-1)
						// TODO: is it the right behavior here?
						resolvers?.reject(new Error('aborted query'))
						return
					case 'fetch':
						report(1)
						contoller = new AbortController()
						api
							.get?.(props, contoller.signal)
							.then((data) => {
								if (contoller.signal.aborted) return
								report(-1)
								api.set?.(props, data)
								send({
									type: 'success',
									payload: { data, since: Date.now() },
								})
							})
							.catch((payload) => {
								if (contoller.signal.aborted) return
								report(-1)
								if (resolvers) {
									resolvers.reject(payload)
									resolvers = undefined
								}
								send({ type: 'error', payload })
								api.onError?.(props, payload)
							})
						return
					case 'data':
						if (action.payload.next !== undefined && resolvers) {
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
	event: Public<EventIn<any>>,
) => void)[] = []

export function sendQueries(
	filter: (props: unknown) => boolean,
	event: Public<EventIn<any>> & { type: Exclude<string, 'update' | 'success'> },
) {
	sendQueriesCallbacks.forEach((callback) => callback(filter, event))
}

export function query<Props, Data>(
	queryProps: QueryProps<Props, Data>,
	hydrate?: Iterable<[Props, { data: Data; since: number }]>,
) {
	const observable = new Observable<
		[props: Props, next: Data | undefined, last: Data | undefined]
	>()
	const c = collection(
		(props: Props) =>
			oneQuery(
				queryProps,
				props,
				observable,
				globalFetchingStore.send.bind(globalFetchingStore),
			),
		{
			ttl: queryProps.ttl ?? defaultTTL,
			hydrate: hydrate
				? {
						values: hydrate,
						decode: (payload, props) =>
							oneQuery(
								queryProps,
								props,
								observable,
								globalFetchingStore.send.bind(globalFetchingStore),
								payload,
							),
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
	function sendSome(
		filter: (props: Props) => boolean,
		event: Public<EventIn<Data>>,
	) {
		c.forEach((key, store) => filter(key) && store.base.send(event))
	}
	sendQueriesCallbacks.push(sendSome)
	return {
		base: (props: Props) => c.get(props).base,
		suspend: (props: Props) => c.get(props).suspend,
		observe: observable.observe.bind(observable),
		sendSome,
	}
}
