import { defineConfig } from "lusiajs/config";

export default defineConfig({
  lazy: { mode: "smart", prefetch: "idle" },
});
