import { Button, Card, Heading } from '@radix-ui/themes'
import { useStore, useStoreValue } from '../../stores/react'
import { Suspense } from 'react'
import { storage } from './storage'
import { Json } from '../Json'
import { globalFetch } from '../../stores/query/globalFetch'

function Fetching() {
	const fetching = useStoreValue(globalFetch)
	return <Card>{`fetching: ${fetching}`}</Card>
}

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
			<Fetching />
			<Suspense>
				<Item prop='hello' />
				<Item prop='hello' />
				<Item prop='world' />
			</Suspense>
		</>
	)
}
