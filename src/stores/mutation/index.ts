import { reducer, type Public } from '../reducer'
import { exhaustive } from '../../functions'
import { type OnMount } from '../../mount'
import { mutationMachine, type EventIn } from './machine'
import { collection } from '../../collection'
import { createReport } from '../createReport'

// TODO: Link with query: optimistic update + cancelation

export type MutationOpts<Props, Data> = {
	mutate: (props: Props, signal: AbortSignal) => Promise<Data>
	onSuccess?: (data: Data, props: Props) => void
	onError?: (error: unknown, props: Props) => void
}

export const globalMutatingStore = createReport()

function oneMutation<Data, Props>(
	props: Props,
	{ mutate, onSuccess, onError }: MutationOpts<Props, Data>,
	report: (delta: number) => void,
	onMount?: OnMount,
) {
	let controller: AbortController
	return reducer(
		{
			reducer: mutationMachine<Props, Data>(),
			onSend: (event, send) => {
				switch (event.type) {
					case 'abort':
						report(-1)
						controller?.abort()
						return
					case 'mutate':
						controller = new AbortController()
						report(1)
						mutate(props, controller.signal)
							.then((data) => {
								if (controller.signal.aborted) return
								report(-1)
								onSuccess?.(data, props)
								event?.payload?.onSuccess?.(data, props)
								send({ type: '_success' })
							})
							.catch((e) => {
								if (controller.signal.aborted) return
								report(-1)
								onError?.(e, props)
								event?.payload?.onError?.(e, props)
								return send({ type: '_error', payload: e })
							})
						return
					default:
						exhaustive(event)
				}
			},
		},
		onMount,
	)
}

export function mutation<Data, Props>(opts: MutationOpts<Props, Data>) {
	const localMutatingStore = createReport()
	const c = collection((props: Props) => {
		return oneMutation<Data, Props>(props, opts, (delta) => {
			localMutatingStore.send(delta)
			globalMutatingStore.send(delta)
		})
	})
	function sendSome(
		filter: (props: Props) => boolean,
		event: Public<EventIn<Props, Data>>,
	) {
		c.forEach((key, store) => filter(key) && store.send(event))
	}
	return {
		active: localMutatingStore,
		get: (props: Props) => c.get(props),
		sendSome,
	}
}
