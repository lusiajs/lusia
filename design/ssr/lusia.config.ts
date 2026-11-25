import { defineConfig } from "lusiajs/config";

export default defineConfig({
  routes: {
    "/": "src/pages/Home.lusia",
    "/editor": "src/pages/Editor.lusia",
    "*": "src/pages/NotFound.lusia",
  },
  // ssr: false,  // uncomment to turn build-time SSR off
});
