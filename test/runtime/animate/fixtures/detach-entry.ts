import { animate } from "#runtime/animate/bind.ts";
import { WHEN } from "#runtime/animate/modes/trigger.ts";
import { leaveThen } from "#runtime/dom/component/leave.ts";

Object.assign(window, { lusiaAnimate: animate, lusiaWhen: WHEN, lusiaLeaveThen: leaveThen });
