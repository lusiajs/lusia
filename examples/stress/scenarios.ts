import * as animate from "./animate/main.ts";
import * as attach from "./attach/main.ts";
import * as components from "./components/main.ts";
import * as each from "./each/main.ts";
import * as expressions from "./expressions/main.ts";
import * as flow from "./flow/main.ts";
import * as layout from "./layout/main.ts";
import * as listen from "./listen/main.ts";
import * as screen from "./screen/main.ts";
import * as styles from "./styles/main.ts";
import * as updates from "./updates/main.ts";

// Each scenario folder exports run(); add a new one here.
export const scenarios = [
  attach.run,
  updates.run,
  expressions.run,
  styles.run,
  components.run,
  animate.run,
  layout.run,
  each.run,
  flow.run,
  listen.run,
  screen.run,
];
