import type { ApiEntry } from "./types.ts";

export const listenEntries: ApiEntry[] = [
  {
    id: "listen",
    name: "listen()",
    kind: "function",
    group: "events",
    signature:
      "listen(target: EventTarget | EventTarget[], what: EVENT | string, fn: (event) => void, options?: ListenOptions): Stop | Stop[]",
    summary: "Runs a function on a DOM event, or on an EVENT such as view or scroll.",
    bullets: [
      'what is a DOM event name, such as "click", or an EVENT value.',
      "Returns a stop function. Call it to stop the listener. Calling it twice is safe.",
      "Pass an array of targets to get an array of stop functions, one per target.",
      'A "scroll" listener is also called once on the next frame, with a scroll event, so it can read the starting position.',
      "In a component, the listener stops when the component detaches. Inside keepRunning(), it runs until its stop is called.",
    ],
    example: `<script>\nimport { listen, onAttach, variable } from "lusiajs";\n\nconst message = variable("Waiting");\n\nonAttach((root) => {\n  const card = root.querySelector("article")!;\n  listen(card, "click", () => {\n    message.value = "Card clicked";\n  });\n});\n</script>\n\n<article>\n  <p>{message}</p>\n</article>`,
  },
  {
    id: "event-value",
    name: "EVENT",
    kind: "value",
    group: "events",
    signature:
      "const EVENT: { readonly VIEW: symbol; readonly SCROLL: symbol; readonly SIZE: symbol; readonly CLICK_OUTSIDE: symbol }",
    summary: "Names the events that listen() can watch besides DOM events.",
    bullets: [
      "Pass a member as the what argument of listen(), such as EVENT.VIEW.",
      "Each member calls fn with its own fields, listed below.",
      "VIEW and SCROLL take the same options as animate. VIEW also takes margin and amount.",
      "Use on:name={fn} in markup for the same events on an element.",
    ],
    example: `<script>\nimport { EVENT, listen, onAttach, variable, type SizeEvent } from "lusiajs";\n\nconst width = variable(0);\n\nonAttach((root) => {\n  const card = root.querySelector("article")!;\n  listen(card, EVENT.SIZE, (event: SizeEvent) => {\n    width.value = Math.round(event.width);\n  });\n});\n</script>\n\n<article>\n  <p>Width: {width}px</p>\n</article>`,
    members: [
      {
        name: "VIEW",
        summary:
          "Calls fn with { in } when the element enters or leaves the screen. Options: margin, amount.",
      },
      {
        name: "SCROLL",
        summary:
          "Calls fn with { progress } from 0 to 1 while the element scrolls. Options: start, end, follow, part.",
      },
      {
        name: "SIZE",
        summary: "Calls fn with { width, height } when the element changes size.",
      },
      {
        name: "CLICK_OUTSIDE",
        summary:
          "Calls fn with the press when the user presses outside the element, or presses Escape.",
      },
    ],
  },
  {
    id: "keep-running",
    name: "keepRunning()",
    kind: "function",
    group: "events",
    signature: "keepRunning(run: () => void): void",
    summary: "Keeps the listeners started inside it running after the component detaches.",
    bullets: [
      "Listeners started inside run are not stopped on detach.",
      "Each one runs until you call its stop function.",
      "Keep the stop function in a variable, so you can call it later.",
      "Use it for work that must go on after the page leaves the component, such as a log.",
    ],
    example: `<script>\nimport { EVENT, keepRunning, listen, onAttach } from "lusiajs";\n\nlet stopWatching = () => {};\n\nonAttach((root) => {\n  const section = root.querySelector("section")!;\n  keepRunning(() => {\n    stopWatching = listen(section, EVENT.VIEW, ({ in: visible }) => {\n      console.log("Section visible:", visible);\n    });\n  });\n});\n\nfunction stop() {\n  stopWatching();\n}\n</script>\n\n<section>Logs its view state</section>\n<button onclick={stop}>Stop watching</button>`,
  },
];
