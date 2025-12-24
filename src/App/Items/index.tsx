import { Button, Card, Heading } from '@radix-ui/themes'
import { useStore, useStoreValue } from '../../stores/react'
import { Suspense } from 'react'
import { storage } from './storage'
import { Json } from '../Json'
import { globalFetchingStore } from '../../stores/query/globalFetching'

function GlobalFetching() {
	const globalFetching = useStoreValue(globalFetchingStore)
	return <Card>{`fetching: ${globalFetching}`}</Card>
}

function Item({ prop }: { prop: string }) {
	const [value, send] = useStore(storage.suspend(prop))
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
			<GlobalFetching />
			<Suspense>
				<Item prop='hello' />
			</Suspense>
			<Suspense>
				<Item prop='hello' />
			</Suspense>
			<Suspense>
				<Item prop='world' />
			</Suspense>
		</>
	)
}
