import { reducer } from '../reducer'
import { exhaustive } from '../../functions'
import { type OnMount } from '../../mount'
import { mutationMachine } from './machine'

export type MutationProps<Props, Data> = {
	mutate: (props: Props, signal: AbortSignal) => Promise<Data>
	onSuccess?: (data: Data) => void
	onError?: (error: unknown) => void
	onMount?: OnMount
}

export function mutation<Data, Props = void>({
	mutate,
	onSuccess,
	onError,
	onMount,
}: MutationProps<Props, Data>) {
	let controller: AbortController
	return reducer(
		{
			reducer: mutationMachine<Props>(),
			act: (action, send) => {
				switch (action.type) {
					case 'abort':
						controller?.abort()
						return
					case 'mutate':
						controller = new AbortController()
						mutate(action.payload, controller.signal)
							.then((data) => {
								if (controller.signal.aborted) return
								onSuccess?.(data)
								send({ type: 'success' })
							})
							.catch((e) => {
								if (controller.signal.aborted) return
								onError?.(e)
								return send({ type: 'error', payload: e })
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
