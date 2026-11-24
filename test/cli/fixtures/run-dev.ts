import { startDev } from "#cli/dev/dev.ts";

const dev = await startDev({
  dir: Bun.argv[2]!,
  port: 0,
  lazy: { mode: "smart", prefetch: "idle" },
});
console.log(dev.url.href);
