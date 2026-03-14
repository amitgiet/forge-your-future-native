type Listener = (...args: any[]) => void;

class AppEventEmitter {
  private listeners: Record<string, Set<Listener>> = {};

  on(event: string, listener: Listener) {
    if (!this.listeners[event]) {
      this.listeners[event] = new Set();
    }
    this.listeners[event].add(listener);
    return () => this.off(event, listener);
  }

  off(event: string, listener: Listener) {
    this.listeners[event]?.delete(listener);
  }

  emit(event: string, ...args: any[]) {
    this.listeners[event]?.forEach((fn) => fn(...args));
  }
}

export const EventEmitter = new AppEventEmitter();
