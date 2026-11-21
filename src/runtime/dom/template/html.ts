import { watch } from "../../variable/graph.ts";
import { toText, type Cleanup } from "./bindings.ts";
import { addClasses } from "./classes.ts";
import { mountBefore, removeNodes, type Mount } from "../blocks/mount.ts";

/** The value's nodes, parsed from a template so the page's scripts do not run while parsing. */
function parseHtml(html: string, classes: string): DocumentFragment {
  const template = document.createElement("template");
  template.innerHTML = html;
  addClasses(template.content, classes);
  return template.content;
}

// The value is trusted: never pass user input, or it can run script (XSS).
export function bindHtml(
  marker: Node,
  read: () => unknown,
  cleanups: Cleanup[],
  classes: string,
): void {
  let mount: Mount | undefined;
  cleanups.push(
    watch(() => {
      if (mount) removeNodes(mount);
      mount = mountBefore(marker, parseHtml(toText(read()), classes), [], []);
    }),
    () => {
      if (mount) removeNodes(mount);
    },
  );
}
