import type { ApiEntry } from "./api/types.ts";
import { animateControlEntries } from "./api/animate-controls.ts";
import { animateEnumEntries } from "./api/animate-enums.ts";
import { animateOptionEntries } from "./api/animate-options.ts";
import { animateTypeEntries } from "./api/animate-types.ts";
import { componentFunctionEntries } from "./api/component-functions.ts";
import { componentTagEntries } from "./api/component-tags.ts";
import { componentTypeEntries } from "./api/component-types.ts";
import { configEntries } from "./api/config.ts";
import { eventEntries } from "./api/events.ts";
import { flowEntries } from "./api/flow.ts";
import { markupEntries } from "./api/markup.ts";
import { stylingEntries } from "./api/styling.ts";
import { variableEntries } from "./api/variables.ts";
import { variableTypeEntries } from "./api/variable-types.ts";

export type { ApiEntry, ApiGroup, ApiKind, ApiMember } from "./api/types.ts";

export const api: ApiEntry[] = [
	...variableEntries,
	...componentFunctionEntries,
	...variableTypeEntries,
	...flowEntries,
	...componentTypeEntries,
	...markupEntries,
	...eventEntries,
	...stylingEntries,
	...componentTagEntries,
	...animateOptionEntries,
	...animateControlEntries,
	...animateEnumEntries,
	...animateTypeEntries,
	...configEntries,
];
