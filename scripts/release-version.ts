const VERSION_PATTERN = /^\d+\.\d+\.\d+(-[0-9A-Za-z]+([.-][0-9A-Za-z]+)*)?$/;

export function isValidVersion(version: string): boolean {
  return VERSION_PATTERN.test(version);
}

export function releaseTag(version: string): string {
  return `v${version}`;
}
