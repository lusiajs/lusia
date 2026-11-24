import { animate } from "#runtime/animate/bind.ts";
import { ON } from "#runtime/animate/modes/trigger.ts";

Object.assign(window, { lusiaAnimate: animate, lusiaOn: ON });
