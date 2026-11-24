import { fileURLToPath } from "node:url";

const ROOT = fileURLToPath(new URL("../", import.meta.url));

interface GitResult {
  ok: boolean;
  output: string;
}

export async function runGit(args: string[]): Promise<GitResult> {
  const proc = Bun.spawn(["git", ...args], { cwd: ROOT, stdout: "pipe", stderr: "pipe" });
  const [stdout, stderr, code] = await Promise.all([
    Bun.readableStreamToText(proc.stdout),
    Bun.readableStreamToText(proc.stderr),
    proc.exited,
  ]);
  return { ok: code === 0, output: (stdout + stderr).trim() };
}

export async function currentBranch(): Promise<string> {
  return (await runGit(["rev-parse", "--abbrev-ref", "HEAD"])).output;
}

export async function isWorkingTreeClean(): Promise<boolean> {
  const result = await runGit(["status", "--porcelain"]);
  return result.ok && result.output === "";
}

export async function tagExists(tag: string): Promise<boolean> {
  const result = await runGit(["tag", "--list", tag]);
  return result.output === tag;
}

export async function commitPaths(message: string, paths: string[]): Promise<GitResult> {
  const staged = await runGit(["add", "--", ...paths]);
  if (!staged.ok) {
    return staged;
  }
  return runGit(["commit", "-m", message, "--", ...paths]);
}

export async function createTag(tag: string): Promise<GitResult> {
  return runGit(["tag", tag]);
}
