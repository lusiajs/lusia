import { formatUpdate, type BlockOptions, type UpdateBlock } from "../log/dev-block.ts";

const BROWSER_WAIT_MS = 1000;

export interface UpdatePrinter {
  show(block: UpdateBlock): void;
  ready(ms: number): void;
  print(text: string): void;
}

/** Holds each update until the browser reports ready, so the block can show the browser time. */
export function createUpdatePrinter(
  write: (text: string) => void,
  options: BlockOptions,
): UpdatePrinter {
  let pending: UpdateBlock | null = null;
  let timer: ReturnType<typeof setTimeout> | undefined;

  function flush(): void {
    clearTimeout(timer);
    if (!pending) return;
    write(formatUpdate(pending, options));
    pending = null;
  }

  return {
    show(block) {
      flush();
      pending = block;
      timer = setTimeout(flush, BROWSER_WAIT_MS);
    },
    ready(ms) {
      if (!pending) return;
      pending.browserMs = ms;
      flush();
    },
    print(text) {
      flush();
      write(text);
    },
  };
}
