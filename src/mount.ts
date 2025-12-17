export type OnMount = () => (() => void) | void
export type Unmount = ReturnType<OnMount>

export function composeMount(a?: OnMount, b?: OnMount) {
	if (a === undefined) return b
	if (b === undefined) return a
	return () => {
		const cleanupA = a()
		const cleanupB = b()
		return () => {
			cleanupB?.()
			cleanupA?.()
		}
	}
}
