import { animate } from "#runtime/animate/bind.ts";
import { WHEN } from "#runtime/animate/modes/trigger.ts";

Object.assign(window, { lusiaAnimate: animate, lusiaWhen: WHEN });
