import type { ErrorCode } from "../codes.ts";

export const COMPILE_CODES = {
  L1001: {
    message: "unclosed <$tag>",
    hint: "Add the closing tag, such as </$tag>, after the content.",
  },
  L1002: {
    message: "only one <script> is allowed",
    hint: "Move the code into one <script> section.",
  },
  L1003: {
    message: "a component's <script> cannot export",
    hint: "Move shared values into a .ts file and import them.",
  },
  L1004: {
    message: "$name is a reserved tag name and cannot be a component",
    hint: "Rename the component. IF, ELSEIF, ELSE, EACH, FOR, CONTENT and HTML are built in.",
  },
  L1005: {
    message: "$message",
    hint: "Check the Sass syntax in this <style> section.",
  },
  L1006: {
    message: "unclosed <!-- comment",
    hint: "Add --> to close the comment.",
  },
  L1007: {
    message: "unclosed <$name>",
    hint: "Add > to close the tag, or /> if it has no content.",
  },
  L1008: {
    message: "unclosed closing tag",
    hint: "Add > after the closing tag name.",
  },
  L1009: {
    message: "<$name> needs a closing </$name>",
    hint: "Add </$name> after its content, or write <$name /> with no content.",
  },
  L1010: { message: "unclosed {", hint: "Add } to close the expression." },
  L1011: {
    message: "empty {}",
    hint: "Put an expression between the braces, such as {count}.",
  },
  L1012: {
    message: "expected an attribute name",
    hint: "Remove the stray character, or add a name.",
  },
  L1013: {
    message: "unclosed attribute value",
    hint: "Add the closing quote after the value.",
  },
  L1014: {
    message: "bind-<property> needs a property name",
    hint: "Write the property after the dash, such as bind-value.",
  },
  L1015: {
    message: "$attr needs {variable}",
    hint: "Put a variable in braces, such as $attr={name}.",
  },
  L1016: {
    message: "$attr needs one {handler}",
    hint: "Put one function in braces, such as onclick={increment}.",
  },
  L1017: {
    message: "an element can have only one animate",
    hint: "Put several animations in one array inside animate.",
  },
  L1018: {
    message: "animate needs {keyframes}",
    hint: "Put the keyframes in braces, such as animate={fadeIn}.",
  },
  L1019: {
    message: "$tag takes no attributes",
    hint: "Remove the attributes from $tag.",
  },
  L1020: {
    message: "$tag has no $attr attribute",
    hint: "Check the spelling. Only the attributes listed in the docs are allowed.",
  },
  L1021: { message: "$attr is given twice", hint: "Keep one $attr attribute." },
  L1022: {
    message: "$attr needs {expression}",
    hint: "Put a value in braces, such as $attr={value}.",
  },
  L1023: {
    message: "bind-element works on elements only",
    hint: "Use bind-element on an element inside the component, not on its tag.",
  },
  L1024: {
    message: "bind-value works on input, textarea and select",
    hint: "Use bind-<property>, such as bind-checked or bind-open, for other elements.",
  },
  L1025: {
    message: "$attr needs a name in {}, like $attr={item}",
    hint: "Use one plain name, with no dots or symbols.",
  },
  L1026: {
    message: "<$name> needs a closing </$name>",
    hint: "Write <$name> ... </$name> instead of <$name />.",
  },
  L1027: {
    message: "expected </$name>",
    hint: "Close the block with </$name> after its content.",
  },
  L1028: {
    message: "expected </$name>, found </$found>",
    hint: "Close the block with </$name> before the other closing tag.",
  },
  L1029: {
    message: "$name needs {condition}",
    hint: "Put the condition in braces first, such as <IF {loggedIn}>.",
  },
  L1030: {
    message: "EACH needs {list}",
    hint: "Put the list in braces first, such as <EACH {items} as={item}>.",
  },
  L1031: {
    message: "FOR needs a name in {}, like {i}",
    hint: "Put the loop name in braces first, such as <FOR {i} to={10}>.",
  },
  L1032: {
    message: "FOR needs to={end}",
    hint: "Add the end value, such as to={10}.",
  },
  L1033: {
    message: "unexpected </$tag>",
    hint: "Remove it, or open the block it closes.",
  },
  L1034: {
    message: "<$tag> must be inside an <IF> block",
    hint: "Write it between <IF {...}> and </IF>, with no </IF> before it: <IF {a}> ... <$tag> ... </IF>.",
  },
  L1035: {
    message: "<CONTENT /> is used more than once",
    hint: "Keep one <CONTENT /> in the component's markup.",
  },
  L1036: {
    message: "<CONTENT> needs />",
    hint: "Write <CONTENT /> with no children. The children go between the component's tags.",
  },
  L1037: {
    message: "<HTML> needs one {expression}",
    hint: "Put one expression in braces between the tags, such as <HTML>{html}</HTML>.",
  },
  L1038: {
    message: "<$tag> must be at the top level of the file",
    hint: "Move it out of the other elements, to the top level of the markup.",
  },
  L1039: {
    message: "<FALLBACK> can only be used once",
    hint: "Keep one <FALLBACK> block, and move its content into it.",
  },
  L1040: {
    message: "<NO_LAZY /> can only be used once",
    hint: "Remove the extra <NO_LAZY /> from this file.",
  },
  L1041: {
    message: "<NO_LAZY /> takes no children",
    hint: "Write it as <NO_LAZY /> with no content between the tags.",
  },
  L1042: {
    message: "$what is not allowed in <FALLBACK>",
    hint: "<FALLBACK> shows before the script runs, so use plain elements and text only.",
  },
  L1043: {
    message: "</$tag> is not used. <$tag> has no closing tag",
    hint: "Remove </$tag>. One </IF> after the last branch closes the whole block: <IF {a}> ... <ELSEIF {b}> ... <ELSE> ... </IF>.",
  },
  L1044: {
    message: "<ELSE> must be the last branch",
    hint: "Move <ELSE> after every <ELSEIF>.",
  },
  L1045: {
    message: "$attr works on elements only, not on components",
    hint: "Pass the function as a prop with an on name, like onselect={fn}, or put on: on an element inside the component.",
  },
  L1046: {
    message: '"$name" is an HTML tag, so it cannot be a component name',
    hint: 'Rename the import, for example import $suggestion from "...". Any name works if it is not an HTML tag.',
  },
  L1047: {
    message: "<style> cannot be inside <EACH> or <FOR>",
    hint: "Move the <style> out of the loop. Only <IF {SCREEN.X}> may wrap a <style>.",
  },
  L1048: {
    message: "<style> inside <IF {$test}> needs a SCREEN condition",
    hint: "Styles are built once, so only screen sizes can switch them: <IF {SCREEN.PHONE}>. Use a class for other conditions.",
  },
  L1049: {
    message: "SCREEN.$name is not a screen size",
    hint: "Use one of: $names. Sizes come from screens in lusia.config.ts.",
  },
  L1050: {
    message: "<NOLAZY /> was renamed to <NO_LAZY />",
    hint: "Write <NO_LAZY /> instead.",
  },
  L1051: {
    message: "<head> can only be used once",
    hint: "Keep one <head> block, and move its content into it.",
  },
  L1052: {
    message: "<NO_SSR /> can only be used once",
    hint: "Remove the extra <NO_SSR /> from this file.",
  },
  L1053: {
    message: "<NO_SSR /> takes no children",
    hint: "Write it as <NO_SSR /> with no content between the tags.",
  },
} as const satisfies Record<string, ErrorCode>;
