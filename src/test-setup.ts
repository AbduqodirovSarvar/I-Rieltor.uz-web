// jsdom lacks a few browser APIs the components use.
class ResizeObserverStub {
  observe = () => undefined;
  unobserve = () => undefined;
  disconnect = () => undefined;
}
(globalThis as { ResizeObserver?: unknown }).ResizeObserver ??= ResizeObserverStub;

if (!globalThis.matchMedia) {
  (globalThis as { matchMedia?: unknown }).matchMedia = (query: string) => ({
    matches: false,
    media: query,
    addEventListener: () => undefined,
    removeEventListener: () => undefined,
  });
}
