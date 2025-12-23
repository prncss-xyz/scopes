import { reducer } from '../reducer'
import { exhaustive } from '../../functions'
import { type OnMount } from '../../mount'
import { mutationMachine } from './machine'
import { assertion } from '../../assertion'

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
	const r = reducer(
		{
			reducer: mutationMachine<Props>(),
			act: (action) => {
				switch (action.type) {
					case 'cancel':
						controller?.abort()
						return
					case 'mutate':
						controller = new AbortController()
						mutate(action.payload, controller.signal)
							.then((data) => {
                if (controller.signal.aborted) return
								onSuccess?.(data)
								r.send({ type: 'success' })
							})
							.catch((e) => {
                if (controller.signal.aborted) return
								onError?.(e)
								return r.send({ type: 'error', payload: e })
							})
						return
					default:
						exhaustive(action)
				}
			},
		},
		onMount,
	)
	return r
}
