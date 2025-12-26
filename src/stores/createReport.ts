import { reducer } from './reducer'

export function createReport() {
	return reducer({
		reducer: {
			init: 0,
			reduce: (event: number, last) => {
				return event + last
			},
			result: (state: number) => state > 0,
		},
	})
}
