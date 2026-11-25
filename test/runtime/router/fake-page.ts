import type { Component } from "#runtime/dom/component/component.ts";
import { syncFromLocation } from "#runtime/router/location.ts";

export type PageLoad = () => Promise<{ default: Component }>;

/** A stand-in page component. It writes its name into the target and logs attach and detach. */
export function fakeComponent(name: string, log: string[]): Component {
  const component = (target: Element) => {
    const root = document.createElement("p");
    root.textContent = name;
    target.append(root);
    log.push(`attach ${name}`);
    return {
      root,
      detach: async () => {
        log.push(`detach ${name}`);
        root.remove();
      },
    };
  };
  return Object.assign(component, { place: () => () => {} }) as unknown as Component;
}

/** A page that loads when `gate` resolves, or at once when there is no gate. */
export function fakePage(name: string, log: string[], gate?: Promise<void>): PageLoad {
  return async () => {
    await gate;
    return { default: fakeComponent(name, log) };
  };
}

/** Gives the test window a real address, so history and location work. */
export function setTestUrl(): Promise<void> {
  const dom = window as unknown as { happyDOM: { setURL(url: string): Promise<void> } };
  return dom.happyDOM.setURL("http://localhost/");
}

/** Lets pending promises and timers run. */
export function settle(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, 0));
}

/** Puts the address bar at `path`, without a history entry, and syncs the router to it. */
export async function resetAddress(path: string): Promise<void> {
  history.replaceState(null, "", path);
  syncFromLocation();
  await settle();
}
