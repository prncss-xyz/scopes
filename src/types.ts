export type OnMount = () => (() => void) | void
export type Unmount = ReturnType<OnMount>
