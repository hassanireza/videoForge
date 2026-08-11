type Listener = () => void;

/**
 * Minimal store base (observable snapshot pattern, compatible with
 * `useSyncExternalStore`). Both ClipLibrary and JobQueueStore extend this so
 * the app has exactly one state-management approach instead of one-off
 * useState calls scattered per component.
 */
export abstract class Store<TState> {
  protected state: TState;
  private listeners = new Set<Listener>();

  constructor(initialState: TState) {
    this.state = initialState;
  }

  getSnapshot = (): TState => this.state;

  subscribe = (listener: Listener): (() => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };

  protected setState(updater: (prev: TState) => TState): void {
    this.state = updater(this.state);
    this.listeners.forEach((l) => l());
  }
}
