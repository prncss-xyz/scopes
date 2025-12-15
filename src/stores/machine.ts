import type { Init } from '../functions'
import type { OnMount } from '../types'
import { reducer } from './reducer'

// TODO: act is required when Action is not never
export interface MachineProps<State, Event, Action, Result> {
	init: Init<State>
	reduce: (action: Event, last: State, act: (action: Action) => void) => State
	result?: (value: State) => Result
	onChange?: (
		send: (event: Event) => void,
	) => (next: State, last: State) => void
	onMount?: (send: (event: Event) => void) => OnMount
	act?: (action: Action) => void
}

function noAct(action: any): any {
	throw new Error(`cannot perform action ${action}`)
}

export function createMachine<State, Event, Action, Result>(
	machine: MachineProps<State, Event, Action, Result>,
	onMount?: OnMount,
) {
	let send: (arg: Event) => void
	const lazySend = (arg: Event) => send(arg)
	const act = machine.act
		? (action: Action) => {
				Promise.resolve().then(() => machine.act!(action))
			}
		: noAct
	const res = reducer(
		{
			init: machine.init,
			reduce: (event: Event, last) => machine.reduce(event, last, act),
			result: machine.result,
			onChange: machine.onChange?.(lazySend),
		},
		() => {
			const cleanup = onMount?.()
			machine

			return () => {
				return cleanup
			}
		},
	)
	send = res.send.bind(res)
	return res
}
