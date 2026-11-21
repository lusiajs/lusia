import type * as TypeScript from "typescript";
import type { ClassType, ClassTypeResolver } from "#compiler/style/markup.ts";
import {
  namedImports,
  resolvedTypeScriptFile,
  scriptText,
  type TypeScriptModule,
} from "./class-imports.ts";
import type { ClassTypes } from "./type-program.ts";

type Checker = TypeScript.TypeChecker;

export function classTypeResolver(
  types: ClassTypes | undefined,
  documentPath: string,
  text: string,
): ClassTypeResolver | undefined {
  if (!types) return undefined;
  const script = scriptText(text);
  const cache = new Map<string, ClassType | undefined>();
  return (name) => {
    if (!cache.has(name)) cache.set(name, readClassType(types, documentPath, script, name));
    return cache.get(name);
  };
}

function readClassType(
  types: ClassTypes,
  documentPath: string,
  script: string,
  name: string,
): ClassType | undefined {
  const imported = namedImports(script).find((item) => item.localName === name);
  if (!imported) return undefined;
  const { ts } = types;
  const file = resolvedTypeScriptFile(ts, imported.specifier, documentPath);
  if (!file) return undefined;
  const program = types.program();
  const sourceFile = program.getSourceFile(file);
  if (!sourceFile) return undefined;
  const checker = program.getTypeChecker();
  const moduleSymbol = checker.getSymbolAtLocation(sourceFile);
  const exported = moduleSymbol
    ? checker.getExportsOfModule(moduleSymbol).find((symbol) => symbol.name === imported.exportName)
    : undefined;
  if (!exported) return undefined;
  const valueType = valueOf(checker, checker.getTypeOfSymbol(exported));
  return classTypeOf(ts, checker, valueType);
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
