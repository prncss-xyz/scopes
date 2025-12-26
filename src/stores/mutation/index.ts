import { reducer, type Public } from '../reducer'
import { exhaustive } from '../../functions'
import { type OnMount } from '../../mount'
import { mutationMachine, type Event } from './machine'
import { collection } from '../../collection'
import { createReport } from '../createReport'

// TODO: Link with query: optimistic update + cancelation

export type MutationOpts<Props, Data> = {
	callback: (props: Props, signal: AbortSignal) => Promise<Data>
	onSuccess?: (data: Data, props: Props) => void
	onError?: (error: unknown, props: Props) => void
}

export const globalMutatingStore = createReport()

function oneMutation<Data, Props>(
	props: Props,
	{ callback, onSuccess, onError }: MutationOpts<Props, Data>,
	report: (delta: number) => void,
	onMount?: OnMount,
) {
	let controller: AbortController
	return reducer(
		{
			reducer: mutationMachine<Props, Data>(),
			act: (action, send) => {
				switch (action.type) {
					case 'abort':
						report(-1)
						controller?.abort()
						return
					case 'mutate':
						controller = new AbortController()
						report(1)
						callback(props, controller.signal)
							.then((data) => {
								if (controller.signal.aborted) return
								report(-1)
								onSuccess?.(data, props)
								action?.payload?.onSuccess?.(data, props)
								send({ type: '_success' })
							})
							.catch((e) => {
								if (controller.signal.aborted) return
								report(-1)
								onError?.(e, props)
								action?.payload?.onError?.(e, props)
								return send({ type: '_error', payload: e })
							})
						return
					default:
						exhaustive(action)
				}
			},
		},
		onMount,
	)
}

export function mutation<Data, Props>(opts: MutationOpts<Props, Data>) {
	const c = collection((props: Props) => {
		const localMutatingStore = createReport()
		return oneMutation<Data, Props>(props, opts, (delta) => {
			localMutatingStore.send(delta)
			globalMutatingStore.send(delta)
		})
	})
	function sendSome(
		filter: (props: Props) => boolean,
		event: Public<Event<Props, Data>>,
	) {
		c.forEach((key, store) => filter(key) && store.send(event))
	}
	return {
		get: (props: Props) => c.get(props),
		sendSome,
	}
}
