import { animate } from "#runtime/animate/bind.ts";
import { ON } from "#runtime/animate/modes/trigger.ts";
import { leaveThen } from "#runtime/dom/component/leave.ts";
import { setAnimateConfig } from "#runtime/animate/options/config.ts";

Object.assign(window, {
  lusiaAnimate: animate,
  lusiaOn: ON,
  lusiaLeaveThen: leaveThen,
  lusiaSetConfig: setAnimateConfig,
});
