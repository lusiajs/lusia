declare module "*.lusia" {
  import type { Component } from "lusiajs";
  const component: Component;
  export default component;
}

declare module "*?raw" {
  const source: string;
  export default source;
}
