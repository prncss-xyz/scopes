import { collection } from '../../collection'
import { queryMachine, type Action, type State, type Event } from './machine'
import { reducer, ReducerStore } from '../reducer'
import { exhaustive, type Reset } from '../../functions'
import { composeMount, type OnMount } from '../../mount'
import { Observable } from '../subscribed'
import { Suspended, suspended } from './suspended'

const defaultTTL = 5 * 60 * 1000
const defaultStaleTime = 0

// TODO: hydrate
// TODO: sync equivalent
// TODO: derived: promises
// TODO: user send function: replace del action, add now to success

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
): {
	get: (key: Props) => Suspended<Data>
	observe: (
		cb: (props: Props, next: Data | Reset, last: Data | Reset) => void,
	) => () => boolean
}
export function query<Props, Data>(
	props: QueryProps<Props, Data, false>,
): {
	get: (
		key: Props,
	) => ReducerStore<State<Data>, Event<Data>, State<Data>, Action<Data>>
	observe: (
		cb: (props: Props, next: Data | Reset, last: Data | Reset) => void,
	) => () => boolean
}
export function query<Props, Data, Suspend = true>({
	ttl,
	staleTime,
	api: { get, set, del, observe },
	onMount,
	onError,
	suspend,
}: QueryProps<Props, Data, Suspend>) {
	suspend ??= true as never
	const observable = new Observable<
		[props: Props, next: Data | Reset, last: Data | Reset]
	>()
	ttl ??= defaultTTL
	staleTime ??= defaultStaleTime
	const raw = collection(
		(props: Props, onMount) => {
			let contoller: AbortController
			const r = reducer(
				{
					reducer: queryMachine<Data>(),
					act: (action) => {
						switch (action.type) {
							case 'abort':
								if (suspend) return
								contoller?.abort()
							case 'fetch':
								contoller = new AbortController()
								get?.(props, contoller.signal)
									.then((data) => {
										if (contoller.signal.aborted) return
										set?.(props, data)
										r.send({
											type: 'success',
											payload: { data, since: Date.now() },
										})
									})
									.catch((payload) => {
										if (contoller.signal.aborted) return
										r.send({ type: 'error', payload })
										onError?.(payload)
									})
								return
							case 'data':
								observable.emit(props, action.payload.next, action.payload.last)
								return
							case 'delete':
								if (!del) return
								r.send({
									type: 'success',
									payload: { data: del(props), since: Date.now() },
								})
								return
							default:
								exhaustive(action)
						}
					},
				},
				composeMount(onMount, () => {
					r.send({
						type: 'mount',
						payload: Date.now() - staleTime,
					})
					return () => r.send({ type: 'unmount' })
				}),
			)
			return (suspend ? suspended(r) : r) as any
		},
		ttl,
		composeMount(
			onMount,
			observe
				? () =>
						observe((p, data) =>
							raw(p).send({
								type: 'success',
								payload: { data, since: Date.now() },
							}),
						)
				: undefined,
		),
	)
	return {
		get: raw,
		observe: observable.observe.bind(observable),
	}
}
