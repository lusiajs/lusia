import { cacheOf } from "#cli/args/settings.ts";
import { startDev } from "#cli/dev/dev.ts";

const dev = await startDev({
  dir: Bun.argv[2]!,
  port: 0,
  lazy: { mode: "smart", prefetch: "idle" },
  cache: cacheOf({}, false),
});
console.log(dev.url.href);
