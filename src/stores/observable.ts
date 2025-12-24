export class Observable<Args extends any[]> {
	private observers = new Set<(...args: Args) => void>()
	observe(cb: (...args: Args) => void) {
		this.observers.add(cb)
		return () => this.observers.delete(cb)
	}
	emit(...args: Args) {
		this.observers.forEach((cb) => cb(...args))
	}
}
