import { Button, Card, Heading } from '@radix-ui/themes'
import { useStore } from '../../stores/react'
import { Suspense } from 'react'
import { storage } from './storage'
import { Json } from '../Json'

function Item({ prop }: { prop: string }) {
	const [raw, send] = useStore(storage.get(prop))
	// const value = raw.type === 'success' ? raw.payload.data : 'loading'
	const value = raw
	return (
		<Card>
			<Heading size='2'>{prop}</Heading>
			<Json>{value}</Json>
			<Button
				onClick={() =>
					send({
						type: 'update',
						payload: (value) => value + 'a',
					})
				}
			>
				+
			</Button>
			<Button
				onClick={() =>
					send({
						type: 'delete',
					})
				}
			>
				x
			</Button>
		</Card>
	)
}

export function Items() {
	return (
		<>
			<Heading size='1'>Items</Heading>
			<Suspense>
				<Item prop='hello' />
				<Item prop='hello' />
				<Item prop='world' />
			</Suspense>
		</>
	)
}
