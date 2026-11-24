/** The command that opens a URL in the default browser on a platform. */
export function openCommand(platform: NodeJS.Platform, url: string): string[] {
  if (platform === "darwin") return ["open", url];
  if (platform === "win32") return ["cmd", "/c", "start", "", url];
  return ["xdg-open", url];
}

export function openBrowser(url: string): void {
  try {
    Bun.spawn(openCommand(process.platform, url), { stdio: ["ignore", "ignore", "ignore"] });
  } catch {
    // No opener on this system. The URL is already on screen.
  }
}
