import { describe, expect, test } from "bun:test";
import { interpolate } from "#runtime/animate/value/interpolate.ts";

describe("interpolate numbers and units", () => {
  test("numbers blend linearly", () => {
    expect(interpolate(0, 10)(0.25)).toBe(2.5);
  });

  test("numbers inside strings keep their units", () => {
    expect(interpolate("10px", "20px")(0.5)).toBe("15px");
  });

  test("transforms blend number by number", () => {
    const at = interpolate("translateX(10px) rotate(0deg)", "translateX(30px) rotate(90deg)");
    expect(at(0.5)).toBe("translateX(20px) rotate(45deg)");
  });

  test("a string with the same text but a new number works", () => {
    expect(interpolate("1.5em", "3.5em")(1)).toBe("3.5em");
  });

  test("identical values stay constant", () => {
    expect(interpolate("block", "block")(0.7)).toBe("block");
  });
});

describe("interpolate colors", () => {
  test("hex colors blend as rgba", () => {
    expect(interpolate("#000", "#fff")(0.5)).toBe("rgba(128, 128, 128, 1)");
  });

  test("8-digit hex carries alpha", () => {
    expect(interpolate("#ff000000", "#ff0000ff")(0.5)).toBe("rgba(255, 0, 0, 0.5)");
  });

  test("rgb() and rgba() blend", () => {
    expect(interpolate("rgb(0, 0, 0)", "rgba(100, 200, 50, 0)")(0.5)).toBe(
      "rgba(50, 100, 25, 0.5)",
    );
  });

  test("rgb() accepts the space syntax with a slash alpha", () => {
    expect(interpolate("rgb(0 0 0 / 0%)", "rgb(100 100 100 / 100%)")(1)).toBe(
      "rgba(100, 100, 100, 1)",
    );
  });

  test("a color inside a longer value is blended in place", () => {
    expect(interpolate("1px solid #000", "3px solid #fff")(0.5)).toBe(
      "2px solid rgba(128, 128, 128, 1)",
    );
  });
});

describe("interpolate fallbacks", () => {
  test("strings with different shapes switch at the middle", () => {
    const at = interpolate("block", "none");
    expect(at(0.4)).toBe("block");
    expect(at(0.6)).toBe("none");
  });

  test("a number and a string of other shape switch at the middle", () => {
    expect(interpolate(1, "auto")(0.2)).toBe(1);
    expect(interpolate(1, "auto")(0.8)).toBe("auto");
  });

  test("arrays of the same length blend item by item", () => {
    expect(interpolate([0, 10], [10, 20])(0.5)).toEqual([5, 15]);
  });

  test("arrays of different length switch at the middle", () => {
    expect(interpolate([1], [1, 2])(0.9)).toEqual([1, 2]);
  });

  test("plain objects blend key by key", () => {
    expect(interpolate({ x: 0, label: "a 1px" }, { x: 4, label: "a 3px" })(0.5)).toEqual({
      x: 2,
      label: "a 2px",
    });
  });

  test("objects with other keys switch at the middle", () => {
    expect(interpolate({ x: 0 }, { y: 4 })(0.9)).toEqual({ y: 4 });
  });
});

describe("a bare 0 takes the unit of the other side", () => {
  test("translateY(0) tweens to translateY(20px)", () => {
    const at = (t: number) => interpolate("translateY(0)", "translateY(20px)")(t);
    expect(at(0)).toBe("translateY(0px)");
    expect(at(0.5)).toBe("translateY(10px)");
    expect(at(1)).toBe("translateY(20px)");
  });

  test("a non-zero number without a unit does not match a number with a unit", () => {
    expect(interpolate("3", "3px")(0.5)).toBe("3px");
  });
});

describe("different length units blend through calc()", () => {
  test("px to vh blends", () => {
    const at = interpolate("0px", "-12vh");
    expect(at(0.25)).toBe("calc(0px + -3vh)");
    expect(at(0.5)).toBe("calc(0px + -6vh)");
    expect(at(1)).toBe("calc(0px + -12vh)");
  });

  test("% to px blends", () => {
    expect(interpolate("100%", "200px")(0.5)).toBe("calc(50% + 100px)");
  });

  test("a bare 0 takes the other unit, so it blends as a plain number", () => {
    expect(interpolate("0", "-12vh")(0.5)).toBe("-6vh");
  });

  test("inside translate() each length blends on its own", () => {
    const at = interpolate("translate(0px, 0px)", "translate(-12vh, 20px)");
    expect(at(0.5)).toBe("translate(calc(0px + -6vh), 10px)");
  });

  test("negative values blend", () => {
    expect(interpolate("-10px", "5vh")(0.5)).toBe("calc(-5px + 2.5vh)");
    expect(interpolate("-4px", "-2%")(0.5)).toBe("calc(-2px + -1%)");
  });

  test("a non-length unit with a different unit still switches at the middle", () => {
    expect(interpolate("1s", "200ms")(0.25)).toBe("1s");
    expect(interpolate("1s", "200ms")(0.75)).toBe("200ms");
  });
});
