import { reducer } from '../reducer'
import { exhaustive } from '../../functions'
import { type OnMount } from '../../mount'
import { mutationMachine } from './machine'

export type MutationProps<Props, Data> = {
	mutate: (props: Props) => Promise<Data>
	onSuccess?: (data: Data) => void
	onError?: (error: unknown) => void
	onMount?: OnMount
}

export function mutation<Props, Data>({
	mutate,
	onSuccess,
	onError,
	onMount,
}: MutationProps<Props, Data>) {
	const r = reducer(
		{
			reducer: mutationMachine<Props>(),
			act: (action) => {
				switch (action.type) {
					case 'cancel':
						throw new Error('Method not implemented.')
					case 'mutate':
						mutate(action.payload)
							.then((data) => {
								onSuccess?.(data)
								r.send({ type: 'success' })
							})
							.catch((e) => {
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
