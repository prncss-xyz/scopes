import type { Init } from '../functions'
import { composeMount, type OnMount } from '../mount'
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
	const onChange = machine.onChange?.(lazySend)
	const res = reducer(
		{
			init: machine.init,
			reduce: (event: Event, last) => {
				const next = machine.reduce(event, last, act)
				if (onChange) Promise.resolve().then(() => onChange(next, last))
				return next
			},
			result: machine.result,
		},
		composeMount(onMount, machine.onMount?.(lazySend)),
	)
	send = res.send.bind(res)
	return res
}
