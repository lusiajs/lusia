import { attach } from "lusiajs";
import type { Result } from "../report.ts";
import Parent from "./Parent.lusia";

const SCOPED_BACKGROUND = "rgb(255, 255, 224)";

function passFail(ok: boolean): string {
  return ok ? "pass" : "fail";
}

export async function run(): Promise<Result[]> {
  const target = document.createElement("div");
  document.body.append(target);
  const instance = attach(Parent, target);

  const parentMark = target.querySelector(".parent > .mark")!;
  const childMark = target.querySelector(".child .mark")!;
  const parentBackground = getComputedStyle(parentMark).backgroundColor;
  const childStyle = getComputedStyle(childMark);

  const results: Result[] = [
    {
      name: "Tree rule reaches child component",
      value: passFail(childStyle.outlineStyle === "solid"),
    },
    {
      name: "Scoped rule stops at child component",
      value: passFail(childStyle.backgroundColor !== parentBackground),
    },
    {
      name: "Scoped rule styles parent's own element",
      value: passFail(parentBackground === SCOPED_BACKGROUND),
    },
  ];

  instance.detach();
  target.remove();
  return results;
}
