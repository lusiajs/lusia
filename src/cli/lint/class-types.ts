import type * as TypeScript from "typescript";
import type { ClassType, ClassTypeResolver } from "#compiler/style/markup.ts";
import { scriptSection } from "#language/parse/sections.ts";

export type TypeScriptModule = typeof TypeScript;
type Checker = TypeScript.TypeChecker;

interface ImportedName {
  specifier: string;
  exportName: string;
}

const NAMED_IMPORT = /import\s*\{([^}]*)\}\s*from\s*["']([^"']+)["']/g;

/** TypeScript is an optional peer. Without it, class types stay unknown. */
export async function loadTypeScript(): Promise<TypeScriptModule | undefined> {
  try {
    return await import("typescript");
  } catch {
    return undefined;
  }
}

export function classTypeResolver(
  ts: TypeScriptModule | undefined,
  documentPath: string,
  text: string,
): ClassTypeResolver | undefined {
  if (!ts) return undefined;
  const script = scriptText(text);
  const programs = new Map<string, TypeScript.Program>();
  const cache = new Map<string, ClassType | undefined>();
  return (name) => {
    if (!cache.has(name)) {
      cache.set(name, readClassType(ts, documentPath, script, name, programs));
    }
    return cache.get(name);
  };
}

function scriptText(text: string): string {
  const section = scriptSection(text);
  return section ? text.slice(section.contentStart, section.contentEnd) : "";
}

function readClassType(
  ts: TypeScriptModule,
  documentPath: string,
  script: string,
  name: string,
  programs: Map<string, TypeScript.Program>,
): ClassType | undefined {
  const imported = importedName(script, name);
  if (!imported) return undefined;
  const file = resolvedFile(ts, imported.specifier, documentPath);
  if (!file) return undefined;
  const program = programFor(ts, file, programs);
  const checker = program.getTypeChecker();
  const sourceFile = program.getSourceFile(file);
  const moduleSymbol = sourceFile && checker.getSymbolAtLocation(sourceFile);
  const exported = moduleSymbol
    ? checker.getExportsOfModule(moduleSymbol).find((symbol) => symbol.name === imported.exportName)
    : undefined;
  if (!exported) return undefined;
  const valueType = valueOf(checker, checker.getTypeOfSymbol(exported));
  return classTypeOf(ts, checker, valueType);
}

function importedName(script: string, name: string): ImportedName | undefined {
  for (const match of script.matchAll(NAMED_IMPORT)) {
    for (const part of match[1]!.split(",")) {
      const [exportName, localName] = part.trim().split(/\s+as\s+/);
      if (exportName && (localName ?? exportName) === name) {
        return { specifier: match[2]!, exportName };
      }
    }
  }
  return undefined;
}

function resolvedFile(ts: TypeScriptModule, specifier: string, documentPath: string) {
  const resolution = ts.resolveModuleName(specifier, documentPath, compilerOptions(ts), ts.sys);
  return resolution.resolvedModule?.resolvedFileName;
}

// One program per imported file, built the first time a name from it is read.
function programFor(
  ts: TypeScriptModule,
  file: string,
  programs: Map<string, TypeScript.Program>,
): TypeScript.Program {
  let program = programs.get(file);
  if (!program) {
    program = ts.createProgram([file], compilerOptions(ts));
    programs.set(file, program);
  }
  return program;
}

function compilerOptions(ts: TypeScriptModule): TypeScript.CompilerOptions {
  return {
    noEmit: true,
    skipLibCheck: true,
    strict: true,
    allowImportingTsExtensions: true,
    module: ts.ModuleKind.ESNext,
    moduleResolution: ts.ModuleResolutionKind.Bundler,
    target: ts.ScriptTarget.ESNext,
  };
}

// The markup shows a variable's value, so a `Variable<T>` or computed value counts as its `value` type.
function valueOf(checker: Checker, type: TypeScript.Type): TypeScript.Type {
  const value = type.getProperty("value");
  if (!value || !type.getProperty("get")) return type;
  return checker.getTypeOfSymbol(value);
}

function classTypeOf(
  ts: TypeScriptModule,
  checker: Checker,
  type: TypeScript.Type,
): ClassType | undefined {
  const members = type.isUnion() ? type.types : [type];
  if (members.some((member) => member.flags & wideFlags(ts))) {
    return { wide: checker.typeToString(type) };
  }
  const values: string[] = [];
  for (const member of members) {
    if (member.isStringLiteral()) values.push(member.value);
    else if (!(member.flags & noClassFlags(ts))) return undefined;
  }
  return values;
}

function wideFlags(ts: TypeScriptModule): number {
  return ts.TypeFlags.String | ts.TypeFlags.Any | ts.TypeFlags.Unknown;
}

function noClassFlags(ts: TypeScriptModule): number {
  return ts.TypeFlags.Undefined | ts.TypeFlags.Null;
}
