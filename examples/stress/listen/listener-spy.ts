// Counts the document listeners for these types, and the elements watched by IntersectionObserver.
const DOCUMENT_TYPES = new Set(["pointerdown", "keydown"]);

export interface ListenerSpy {
  documentListeners(): number;
  observedElements(): number;
  restore(): void;
}

type Listener = EventListenerOrEventListenerObject;
type ListenerOptions = AddEventListenerOptions | EventListenerOptions | boolean;

export function spyOnListeners(): ListenerSpy {
  const documentByType = new Map<string, Set<Listener>>();
  const observed = new Set<Element>();

  const addEventListener = document.addEventListener;
  const removeEventListener = document.removeEventListener;
  const observe = IntersectionObserver.prototype.observe;
  const unobserve = IntersectionObserver.prototype.unobserve;

  function setFor(type: string): Set<Listener> {
    let listeners = documentByType.get(type);
    if (!listeners) {
      listeners = new Set();
      documentByType.set(type, listeners);
    }
    return listeners;
  }

  document.addEventListener = function (
    type: string,
    listener: Listener,
    options?: ListenerOptions,
  ) {
    if (DOCUMENT_TYPES.has(type)) setFor(type).add(listener);
    return addEventListener.call(this, type, listener, options);
  };
  document.removeEventListener = function (
    type: string,
    listener: Listener,
    options?: ListenerOptions,
  ) {
    if (DOCUMENT_TYPES.has(type)) setFor(type).delete(listener);
    return removeEventListener.call(this, type, listener, options);
  };
  IntersectionObserver.prototype.observe = function (element: Element) {
    observed.add(element);
    return observe.call(this, element);
  };
  IntersectionObserver.prototype.unobserve = function (element: Element) {
    observed.delete(element);
    return unobserve.call(this, element);
  };

  return {
    documentListeners: () => [...documentByType.values()].reduce((sum, set) => sum + set.size, 0),
    observedElements: () => observed.size,
    restore() {
      document.addEventListener = addEventListener;
      document.removeEventListener = removeEventListener;
      IntersectionObserver.prototype.observe = observe;
      IntersectionObserver.prototype.unobserve = unobserve;
    },
  };
}
