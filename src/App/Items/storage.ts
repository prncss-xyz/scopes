import { memoryStorage } from '../../stores/query/memory'
import { query } from '../../stores/query'

export const storage = query(
	{
		ttl: Infinity,
		staleTime: Infinity,
		api: memoryStorage({
			getDefault: () => 'default',
		}),
		suspend: true,
	},
	[['world', { data: 'monde', since: 0 }]],
)

storage.observe((key, next, last) => console.log(key, next, last))
