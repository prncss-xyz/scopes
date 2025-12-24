import { Button, Card, Heading } from '@radix-ui/themes'
import { useStore } from '../stores/react'
import { mutation } from '../stores/mutation'
import { Json } from './Json'
import { delayed } from '../stores/query/memory'

export function Mutation() {
	const [state, send] = useStore(
		mutation({
			mutate: async (_props, signal) => {
				await delayed(1000)
				if (signal.aborted) return undefined as never
				const value = Math.floor(Math.random() * 100)
				if (value % 2 === 0) throw new Error('even error')
				return value
			},
			onSuccess: (s) => console.log('success', s),
			onError: (e) => console.log('error', e),
		}),
	)
	return (
		<Card>
			<Heading size='1'>Mutation</Heading>
			<Button
				disabled={state.type === 'pending'}
				onClick={() => send({ type: 'mutate', payload: undefined })}
			>
				Mutate
			</Button>
			<Button
				disabled={state.type !== 'pending'}
				onClick={() => send({ type: 'abort' })}
			>
				Abort
			</Button>
			<Json>{state}</Json>
		</Card>
	)
}
