import { noop } from '../../functions'
import { reducer } from '../reducer'

export const globalFetch = reducer({
	reducer: {
		init: 0,
		reduce: (event: number, last) => {
			return event + last
		},
		result: (state: number) => state > 0,
	},
	act: noop,
})
