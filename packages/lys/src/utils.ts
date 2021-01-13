import { useEffect, useLayoutEffect } from "react";

export const IS_SERVER =
  typeof window === "undefined" ||
  // @ts-ignore
  !!(typeof Deno !== "undefined" && Deno && Deno.version && Deno.version.deno);

export const useIsomorphicLayoutEffect = IS_SERVER
  ? useEffect
  : useLayoutEffect;

const hasOwnKey = Object.prototype.hasOwnProperty;

// Object.is polyfill
const is = (x: any, y: any): boolean => {
  if (x === y) {
    return x !== 0 || y !== 0 || 1 / x === 1 / y;
  } else {
    return x !== x && y !== y;
  }
};

/** Shallow equality check */
export const shallowEqual = (prev: any, next: any) => {
  if (is(prev, next)) return true;
  if (typeof prev !== typeof next) return false;

  if (Array.isArray(prev) && Array.isArray(next)) {
    if (prev.length !== next.length) return false;

    for (const idx in prev) {
      if (!is(prev[idx], next[idx])) return false;
    }

    return true;
  }

  if (
    typeof prev === "object" &&
    typeof next === "object" &&
    prev !== null &&
    next !== null
  ) {
    for (const key in prev) {
      if (!hasOwnKey.call(next, key)) continue;
      if (!is(prev[key], next[key])) return false;
    }
  }

  return false;
};
