import { Button, Card, Heading } from '@radix-ui/themes'
import { useStore, useStoreValue } from '../stores/react'
import { mutation } from '../stores/mutation'
import { Json } from './Json'
import { delayed } from '../stores/query/memory'

const m = mutation({
	mutate: async (_props: number, signal) => {
		await delayed(1000)
		if (signal.aborted) return undefined as never
		const value = Math.floor(Math.random() * 100)
		if (value % 2 === 0) throw new Error('even error')
		return value
	},
	onSuccess: (s) => console.log('success', s),
	onError: (e) => console.log('error', e),
})

export function Mutation() {
	const active = useStoreValue(m.active)
	const [state, send] = useStore(m.get(3))
	return (
		<Card>
			<Heading size='1'>Mutation</Heading>
			<Button
				disabled={active}
				onClick={() =>
					send({
						type: 'mutate',
					})
				}
			>
				Mutate
			</Button>
			<Button disabled={!active} onClick={() => send({ type: 'abort' })}>
				Abort
			</Button>
			<Json>{state}</Json>
		</Card>
	)
}
