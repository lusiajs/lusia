import { GlobalRegistrator } from "@happy-dom/global-registrator";
import { plugin } from "bun";
import { lusia } from "lusiajs/bun-plugin";

GlobalRegistrator.register();
plugin(lusia({ dev: true }));
