export const capitalize = (text?: string) =>
  !text
    ? text
    : text
        .split(/(?=[\s-_'])/)
        .map((part) => part.toLowerCase())
        .map((part) => part.replace(/([a-z])/, (c) => c.toUpperCase()))
        .join("");
