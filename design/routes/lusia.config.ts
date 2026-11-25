import { defineConfig } from "lusiajs/config";

export default defineConfig({
  routes: {
    "/": "src/pages/Home.lusia",
    "/guide": "src/pages/Guide.lusia",
    "/blog/:id": "src/pages/Post.lusia",
    "*": "src/pages/NotFound.lusia",
  },
});
