export type LiveAction = {
  name: string;
  targetId?: string;
  payload?: Record<string, unknown>;
};

type Listener = (action: LiveAction) => void;

const listeners = new Set<Listener>();

export function dispatchLiveAction(action: LiveAction): void {
  for (const listener of listeners) {
    listener(action);
  }
}

export function subscribeLiveAction(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
