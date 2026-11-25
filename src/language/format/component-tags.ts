const COMPONENT_TAG = /<(\/?)([A-Z][\w.]*)(?=[\s/>])/g;
const PLACEHOLDER_TAG = /<(\/?)lusia-component-(\d+)(?=[\s/>])/g;

export interface ProtectedComponents {
  text: string;
  names: string[];
}

// Prettier lowercases tags named like HTML elements, so <Content> would become <content>.
export function protectComponentTags(markup: string): ProtectedComponents {
  const names: string[] = [];
  const text = markup.replace(COMPONENT_TAG, (_tag, slash: string, name: string) => {
    const index = names.indexOf(name);
    const id = index === -1 ? names.push(name) - 1 : index;
    return `<${slash}lusia-component-${id}`;
  });
  return { text, names };
}

export function restoreComponentTags(html: string, names: string[]): string {
  return html.replace(
    PLACEHOLDER_TAG,
    (_tag, slash: string, id: string) => `<${slash}${names[Number(id)]}`,
  );
}
