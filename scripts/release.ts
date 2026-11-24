import { readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { setPackageVersionText } from "./release-package-json.ts";
import {
  commitPaths,
  createTag,
  currentBranch,
  isWorkingTreeClean,
  tagExists,
} from "./release-git.ts";
import { isValidVersion, releaseTag } from "./release-version.ts";

const ROOT = fileURLToPath(new URL("../", import.meta.url));
const RELEASE_BRANCH = "dev";
const PACKAGE_FILES = [
  "package.json",
  "packages/prettier-plugin/package.json",
  "packages/vscode-support/package.json",
];

function fail(message: string): never {
  console.error(`release: ${message}`);
  process.exit(1);
}

async function checkPreconditions(version: string): Promise<void> {
  if ((await currentBranch()) !== RELEASE_BRANCH) {
    fail(`releases run from ${RELEASE_BRANCH}. Switch to it first.`);
  }
  if (!(await isWorkingTreeClean())) {
    fail("the working tree has changes. Commit or stash them first.");
  }
  if (await tagExists(releaseTag(version))) {
    fail(`the tag ${releaseTag(version)} already exists. Pick a new version.`);
  }
}

async function readFiles(): Promise<Map<string, string>> {
  const entries = await Promise.all(
    PACKAGE_FILES.map(async (file) => [file, await readFile(join(ROOT, file), "utf8")] as const),
  );
  return new Map(entries);
}

async function writeFiles(files: Map<string, string>): Promise<void> {
  await Promise.all([...files].map(([file, text]) => writeFile(join(ROOT, file), text)));
}

async function runCheck(): Promise<boolean> {
  const proc = Bun.spawn(["bun", "run", "check"], {
    cwd: ROOT,
    stdout: "inherit",
    stderr: "inherit",
  });
  return (await proc.exited) === 0;
}

function printNextSteps(version: string): void {
  const tag = releaseTag(version);
  console.log(`
Released ${version} on ${RELEASE_BRANCH} as ${tag}. Next steps:

  git push origin ${RELEASE_BRANCH}
  git switch main && git merge --ff-only ${RELEASE_BRANCH} && git push origin main
  git push origin ${tag}     # starts the publish workflow
  git switch ${RELEASE_BRANCH}`);
}

async function main(): Promise<void> {
  const version = process.argv[2] ?? "";
  if (!isValidVersion(version)) {
    fail(
      `"${version}" is not a version. Use major.minor.patch with an optional -prerelease, such as 0.1.5 or 0.1.5-beta.`,
    );
  }
  await checkPreconditions(version);

  const originals = await readFiles();
  const updated = new Map(
    [...originals].map(([file, text]) => [file, setPackageVersionText(text, version)]),
  );
  await writeFiles(updated);

  if (!(await runCheck())) {
    await writeFiles(originals);
    fail(`bun run check failed. The files are restored to ${RELEASE_BRANCH}.`);
  }

  const commit = await commitPaths(`chore(release): ${version}`, PACKAGE_FILES);
  if (!commit.ok) {
    fail(`commit failed: ${commit.output}`);
  }
  const tag = await createTag(releaseTag(version));
  if (!tag.ok) {
    fail(`tag failed: ${tag.output}`);
  }
  printNextSteps(version);
}

await main();
