import { familly } from '../../collection'
import { createMachine } from '../machine'
import { queryMachine } from './machine'

const defaultTTL = 5 * 60 * 1000
const defaultStaleTime = 0

export function query<Props, Value>({
	ttl,
	staleTime,
	fn,
}: {
	staleTime?: number
	ttl?: number
	fn: (props: Props) => Promise<Value>
}) {
	return familly(
		createMachine,
		(props: Props) =>
			queryMachine({
				staleTime: staleTime ?? defaultStaleTime,
				query: () => fn(props),
			}),
		ttl ?? defaultTTL,
	)
}
