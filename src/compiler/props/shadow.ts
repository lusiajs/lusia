const IDENTIFIER = /^[A-Za-z_$][\w$]*$/;
const NAMED = [
  /\b(?:const|let|var|function|class)\s+([A-Za-z_$][\w$]*)/g,
  /\bcatch\s*\(\s*([A-Za-z_$][\w$]*)/g,
  /\b([A-Za-z_$][\w$]*)\s*=>/g,
];
const PARAMETERS = [/\(([^()]*)\)\s*=>/g, /\bfunction\b\s*[\w$]*\s*\(([^()]*)\)/g];
const PATTERN = /\b(?:const|let|var)\s*\{([^}]*)\}/g;

export interface Shadow {
  name: string;
  index: number;
}

export function findShadow(masked: string, names: ReadonlySet<string>): Shadow | undefined {
  const found = declaredNames(masked).filter((shadow) => names.has(shadow.name));
  return found.sort((a, b) => a.index - b.index)[0];
}

function declaredNames(masked: string): Shadow[] {
  return [
    ...NAMED.flatMap((pattern) => matchesOf(masked, pattern, 1)),
    ...PARAMETERS.flatMap((pattern) => matchesOf(masked, pattern, 1).flatMap(splitParameters)),
    ...matchesOf(masked, PATTERN, 1).flatMap(splitPattern),
  ];
}

function matchesOf(masked: string, pattern: RegExp, group: number): Shadow[] {
  const found: Shadow[] = [];
  for (const match of masked.matchAll(pattern)) {
    const name = match[group]!;
    found.push({ name, index: match.index + match[0].indexOf(name) });
  }
  return found;
}

function splitParameters(shadow: Shadow): Shadow[] {
  return shadow.name.split(",").flatMap((part) => entryName(part.replace("...", ""), shadow.index));
}

function splitPattern(shadow: Shadow): Shadow[] {
  return shadow.name.split(",").flatMap((part) => entryName(part.split(":").pop()!, shadow.index));
}

function entryName(text: string, index: number): Shadow[] {
  const name = text.split("=")[0]!.trim();
  return IDENTIFIER.test(name) ? [{ name, index }] : [];
}
