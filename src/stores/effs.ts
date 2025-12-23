import type { Teardown } from '../mount'

export function effs<Eff, Event, State>(
	interpreters?: Interpreters<Eff, Event>,
	definitions?: Definitions<Eff, State>,
) {
	if (!interpreters || !definitions) return undefined
	const teardowns: Partial<Record<keyof Eff, Teardown>> = {}
	const last: Partial<{ [K in keyof Eff]: Eff[K] }> = {}
	return {
		teardown() {
			for (const key in interpreters) {
				teardowns[key]?.()
			}
		},
		onChange(state: State, send: (event: Event) => void) {
			for (const key in interpreters) {
				const value = definitions[key](state)
				if (Object.is(value, last[key])) continue
				teardowns[key]?.()
				teardowns[key] = interpreters[key](value, send)
			}
		},
	}
}

type Interpreter<Value, Event> = (
	value: Value,
	send: (event: Event) => void,
) => Teardown
type Interpreters<Eff, Event> = {
	[K in keyof Eff]: Interpreter<Eff[K], Event>
}
type Definition<State, Value> = (state: State) => Value
type Definitions<Eff, State> = {
	[K in keyof Eff]: Definition<State, Eff[K]>
}
