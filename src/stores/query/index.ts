import { collection } from '../../collection'
import { queryMachine, type State } from './machine'
import { reducer } from '../reducer'
import { exhaustive, type Reset } from '../../functions'
import { composeMount, type OnMount } from '../../mount'
import { Observable } from '../subscribed'

const defaultTTL = 5 * 60 * 1000
const defaultStaleTime = 0

// TODO: hydrate
// TODO: suspend
// TODO: cancel pending queries
// TODO: sync equivalent
// TODO: preserve state in dev

export type QueryProps<Props, Data> = {
	ttl?: number
	staleTime?: number
	get?: (props: Props) => Promise<Data>
	set?: (props: Props, value: Data) => void
	observe?: (emit: (props: Props, value: Data) => void) => () => void
	onMount?: OnMount
}

export function query<Props, Data>({
	ttl,
	staleTime,
	get,
	set,
	observe,
	onMount,
}: QueryProps<Props, Data>) {
	const observable = new Observable<
		[props: Props, next: Data | Reset, last: Data | Reset]
	>()
	ttl ??= defaultTTL
	staleTime ??= defaultStaleTime
	const c = collection(
		(props: Props, onMount) => {
			const r = reducer(
				{
					reducer: queryMachine<Data>(),
					act: (action) => {
						switch (action.type) {
							case 'cancel':
								throw new Error('Method not implemented.')
							case 'fetch':
								get?.(props)
									.then((data) => {
										set?.(props, data)
										r.send({
											type: 'success',
											payload: { data, since: Date.now() },
										})
									})
									.catch((payload) => {
										return r.send({ type: 'error', payload })
									})
								return
							case 'data':
								observable.emit(props, action.payload.next, action.payload.next)
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
			return r
		},
		ttl,
		composeMount(
			onMount,
			observe
				? () =>
						observe((p, data) =>
							c(p).send({
								type: 'success',
								payload: { data, since: Date.now() },
							}),
						)
				: undefined,
		),
	)
	return {
		get: c,
		suspend: (props: Props) => c(props).map(suspend),
		observe: observable.observe.bind(observable),
	}
}

function suspend<Data>(state: State<Data>) {
	switch (state.type) {
		case 'success':
		case 'pending':
			return state.payload.promise
		case 'error':
			throw state.payload
		default:
			exhaustive(state)
	}
}
