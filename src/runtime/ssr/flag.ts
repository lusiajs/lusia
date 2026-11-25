/** True while the build renders a page on the server (see src/cli/build/ssr). */
export function isServerRender(): boolean {
  return (globalThis as { __LUSIA_SSR__?: boolean }).__LUSIA_SSR__ === true;
}
