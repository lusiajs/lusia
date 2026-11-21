export const tone: "odd" | "even" = "odd";

export const label: string = "odd";

export const shade = {
  value: "odd" as "odd" | "even",
  get() {
    return this.value;
  },
};
