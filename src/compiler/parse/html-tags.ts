// HTML tag names ignore case, so every name is stored in lowercase and checked with toLowerCase().

const HTML_ELEMENTS = `
  a abbr address area article aside audio b base bdi bdo blockquote body br button
  canvas caption cite code col colgroup data datalist dd del details dfn dialog div dl dt
  em embed fieldset figcaption figure footer form h1 h2 h3 h4 h5 h6 head header hgroup hr
  html i iframe img input ins kbd label legend li link main map mark menu meta meter nav
  noscript object ol optgroup option output p picture pre progress q rp rt ruby s samp
  script search section select selectedcontent slot small source span strong style sub
  summary sup table tbody td template textarea tfoot th thead time title tr track u ul var
  video wbr
  applet acronym basefont bgsound big blink center dir font frame frameset image isindex
  keygen listing marquee menuitem multicol nextid nobr noembed noframes param plaintext rb
  rtc spacer strike tt xmp
`;

const SVG_ELEMENTS = `
  a animate animateMotion animateTransform circle clipPath defs desc discard ellipse
  feBlend feColorMatrix feComponentTransfer feComposite feConvolveMatrix feDiffuseLighting
  feDisplacementMap feDistantLight feDropShadow feFlood feFuncA feFuncB feFuncG feFuncR
  feGaussianBlur feImage feMerge feMergeNode feMorphology feOffset fePointLight
  feSpecularLighting feSpotLight feTile feTurbulence filter foreignObject g hatch hatchpath
  image line linearGradient marker mask mesh meshgradient meshpatch meshrow metadata mpath
  path pattern polygon polyline radialGradient rect script set solidcolor stop style svg
  switch symbol text textPath title tspan unknown use view
`;

const MATHML_ELEMENTS = `
  annotation annotation-xml maction malignmark math merror mfrac mglyph mi mmultiscripts mn
  mo mover mpadded mphantom mprescripts mroot mrow ms mspace msqrt mstyle msub msubsup msup
  mtable mtd mtext mtr munder munderover semantics
`;

function words(text: string): string[] {
  return text
    .trim()
    .split(/\s+/)
    .map((word) => word.toLowerCase());
}

export const HTML_TAGS: ReadonlySet<string> = new Set([
  ...words(HTML_ELEMENTS),
  ...words(SVG_ELEMENTS),
  ...words(MATHML_ELEMENTS),
]);
