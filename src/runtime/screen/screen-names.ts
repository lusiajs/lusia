import type { ComputedVariable } from "../variable/compute.ts";

/** Each project adds its screen names here with declaration merging. See .lusia/screens.d.ts. */
export interface ProjectScreens {}

interface DefaultScreenNames {
  PHONE: true;
  TABLET: true;
  DESKTOP: true;
}

/** The default names apply only when the project declares none. */
export type ScreenNamesFrom<Project> = keyof Project extends never ? DefaultScreenNames : Project;

export type ScreenFlags<Names> = { readonly [Name in keyof Names]: ComputedVariable<boolean> };
