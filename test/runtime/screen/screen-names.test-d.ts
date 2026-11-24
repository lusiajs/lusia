// Type-level checks. `tsc` runs this file; each @ts-expect-error line fails the build if it stops being an error.
import type { ScreenObject } from "#runtime/index.ts";
import type { ScreenFlags, ScreenNamesFrom } from "#runtime/screen/screen-names.ts";

type Equal<A, B> =
  (<T>() => T extends A ? 1 : 2) extends <T>() => T extends B ? 1 : 2 ? true : false;

// Default: no project screens, so the three default names and REDUCED_MOTION.
const defaultKeys: Equal<keyof ScreenObject, "PHONE" | "TABLET" | "DESKTOP" | "REDUCED_MOTION"> =
  true;
// @ts-expect-error: MOBILE is not a default screen
const defaultMobile = (null as unknown as ScreenObject).MOBILE;

// Override: a project's own names replace the defaults.
type MobileWide = { MOBILE: true; WIDE: true };
const overrideKeys: Equal<keyof ScreenFlags<ScreenNamesFrom<MobileWide>>, "MOBILE" | "WIDE"> = true;
// @ts-expect-error: PHONE is not a project screen
type OverridePhone = ScreenFlags<ScreenNamesFrom<MobileWide>>["PHONE"];

export { defaultKeys, defaultMobile, overrideKeys };
