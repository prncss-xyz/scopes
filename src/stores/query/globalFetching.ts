import { reducer } from '../reducer'

export const globalFetchingStore = reducer({
	reducer: {
		init: 0,
		reduce: (event: number, last) => {
			return event + last
		},
		result: (state: number) => state > 0,
	},
})
