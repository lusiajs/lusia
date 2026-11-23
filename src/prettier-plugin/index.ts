import type { Plugin } from "prettier";
import { parseLusia, type LusiaParserOptions, type LusiaRoot } from "./parse.ts";

const plugin = {
  languages: [{ name: "Lusia", parsers: ["lusia"], extensions: [".lusia"] }],
  parsers: {
    lusia: {
      astFormat: "lusia",
      parse: (text: string, options: LusiaParserOptions) => parseLusia(text, options),
      locStart: () => 0,
      locEnd: (node: LusiaRoot) => node.end,
    },
  },
  printers: {
    lusia: {
      print: (path) => path.node.formatted,
    },
  },
  options: {
    lusiaIndentScriptAndStyle: {
      category: "Lusia",
      type: "boolean",
      default: true,
      description: "Indent the code inside <script> and <style> by one indent level.",
    },
  },
} satisfies Plugin<LusiaRoot>;

export const languages = plugin.languages;
export const parsers = plugin.parsers;
export const printers = plugin.printers;
export const options = plugin.options;
export default plugin;
