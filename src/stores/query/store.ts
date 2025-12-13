import type { OnMount } from '../../family'
import type { Init } from '../../functions'
import { reducer, ReducerStore } from '../reducer'
import { queryMachine } from './queryMachine'

type Machine<State, Event, Eff = Record<PropertyKey, never>, Result = State> = {
	init: Init<State>
	reduce: (event: Event, state: State) => State
	result?: (state: State) => Result
	effects?: { [K in keyof Eff]: (state: State) => Eff[K] }
	// actions
}

class MachineStore<
	State,
	Event,
	Eff = Record<PropertyKey, never>,
	Result = State,
> extends ReducerStore<State, Event, Result> {
	machine
	states: any = undefined
	constructor(machine: Machine<State, Event, Eff, Result>, onMount?: OnMount) {
		super(machine, onMount)
		this.machine = machine
	}
	send(arg: Event): void {
		super.send(arg)
		if (this.machine.effects) {
			Promise.resolve().then(() => {
				if (!this.machine.effects) return
				for (const [k, v] of Object.entries<any>(this.machine.effects)) {
					const eff = v(this.value)
					const entry = this.states[k]
					if (this.states && Object.is(eff, entry.value)) continue
					entry.unmount?.()
				}
			})
		}
	}
}

export function machine<State, Event, Eff = Record<PropertyKey, never>>(
	machine: Machine<State, Event, Eff>,
) {
	const store = reducer(machine)
}
