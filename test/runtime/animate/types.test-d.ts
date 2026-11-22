// Type-level checks. `tsc` runs this file; each @ts-expect-error line fails the build if it stops being an error.
import {
  WHEN,
  EASE,
  EDGE,
  setConfig,
  type AnimateItem,
  type Keyframes,
  type Style,
} from "#runtime/index.ts";

const css: Style = { opacity: 1, backgroundColor: "red", translate: "0px 10px", "--gap": "4px" };

// Style: DOM property names in camelCase, custom properties, numbers or strings.
const keyframes: Keyframes = { 0: { opacity: 0 }, 1: { opacity: 1, borderRadius: 4 } };

// @ts-expect-error: not a CSS property
const unknownCss: Style = { fontSpacey: 1 };

// @ts-expect-error: types are camelCase only
const kebabCss: Style = { "background-color": "red" };

// @ts-expect-error: a style value must be a string or a number
const objectCss: Style = { opacity: { value: 1 } };

// Keys 0 and 1 are required.
// @ts-expect-error: key 1 is missing
const missingOne: Keyframes = { 0: { opacity: 0 } };

// The keyframes default takes the forms [style, ease], [style] or [ease].
const withDefault: Keyframes = {
  default: [EASE.STYLE.QUART, EASE.OUT],
  0: { opacity: 0 },
  1: { opacity: 1 },
};
const defaultEase: Keyframes = { default: [EASE.OUT], 0: { opacity: 0 }, 1: { opacity: 1 } };
const defaultWrongOrder: Keyframes = {
  // @ts-expect-error: the parts are in the wrong order
  default: [EASE.OUT, EASE.STYLE.QUART],
  0: { opacity: 0 },
  1: { opacity: 1 },
};

// Wrong EASE values are rejected in a key.
// @ts-expect-error: a string is not an ease
const wrongEase: Keyframes = { 0: { opacity: 0 }, 1: [EASE.STYLE.QUART, "in", { opacity: 1 }] };
// @ts-expect-error: EASE.STYLE has no member NOPE
const wrongStyle: Keyframes = { 0: { opacity: 0 }, 1: [EASE.STYLE.NOPE, EASE.OUT, { opacity: 1 }] };
// @ts-expect-error: a direction (IN) is not an easing style
const directionInStyle: Keyframes = { 0: { opacity: 0 }, 1: [EASE.IN, EASE.OUT, { opacity: 1 }] };

// AnimateItem: `more` is typed by the trigger.
const plain: AnimateItem = { style: keyframes };
const view: AnimateItem = {
  style: keyframes,
  when: WHEN.VIEW,
  more: { margin: "10%", amount: 0.5, reverse: true },
};
const hover: AnimateItem = {
  style: keyframes,
  when: WHEN.HOVER,
  more: { outDelay: 50, out: { 0: { opacity: 1 }, 1: { opacity: 0 } } },
};
const scroll: AnimateItem = {
  style: keyframes,
  when: WHEN.SCROLL,
  more: { start: [EDGE.TOP, EDGE.BOTTOM], end: [EDGE.BOTTOM, 0.2] },
};

// @ts-expect-error: HOVER takes no margin
const hoverMargin: AnimateItem = { style: keyframes, when: WHEN.HOVER, more: { margin: 10 } };

// @ts-expect-error: VIEW takes no outDelay
const viewOutDelay: AnimateItem = { style: keyframes, when: WHEN.VIEW, more: { outDelay: 50 } };

// @ts-expect-error: an item with no trigger takes no more
const plainMore: AnimateItem = { style: keyframes, more: { margin: 10 } };

// @ts-expect-error: a variable as when takes no more
const variableMore: AnimateItem = { style: keyframes, when: WHEN.ATTACH, more: { reverse: true } };

// @ts-expect-error: reverse moved into more
const topReverse: AnimateItem = { style: keyframes, when: WHEN.VIEW, reverse: true };

// @ts-expect-error: ease moved into the keyframes default
const itemEase: AnimateItem = { style: keyframes, ease: EASE.IN };

// setConfig takes animate and lazy sections only.
setConfig({ animate: { ease: [EASE.STYLE.CUBIC, EASE.OUT], duration: 400 } });
// @ts-expect-error: speed is not a config key
setConfig({ speed: 2 });

export { css, defaultEase, hover, keyframes, missingOne, plain, scroll, view, withDefault };
export {
  defaultWrongOrder,
  directionInStyle,
  hoverMargin,
  itemEase,
  plainMore,
  variableMore,
  topReverse,
  unknownCss,
  kebabCss,
  objectCss,
  wrongEase,
  wrongStyle,
  viewOutDelay,
};

// @ts-expect-error: cssText is excluded from animatable styles
const cssTextStyle: Style = { cssText: "opacity: 1" };

// @ts-expect-error: length is a number on the DOM, not a style
const lengthStyle: Style = { length: 1 };

export { cssTextStyle, lengthStyle };
