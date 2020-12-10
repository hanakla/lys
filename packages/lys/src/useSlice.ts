import { useCallback, useReducer, useRef } from "react";
import { useLysContext } from "./context";
import { SliceMeta, StateOfSlice } from "./slice";

export type SliceSelector = (context: {
  get: <S extends SliceMeta<any>>(slice: S) => StateOfSlice<S>;
}) => any;

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
const isEqual = (prev: any, next: any) => {
  if (is(prev, next)) return true;
  if (typeof prev !== typeof next) return false;

  if (Array.isArray(prev) && Array.isArray(next)) {
    if (prev.length !== next.length) return false;

    for (const idx in prev) {
      if (!is(prev[idx], next[idx])) return false;
    }
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

export const useSliceSelector = <S extends SliceSelector>(
  selector: S,
  checkEquallity: (a: any, b: any) => boolean = isEqual
): ReturnType<S> => {
  const context = useLysContext();
  const [, rerender] = useReducer((s) => s + 1, 0);
  const prevState = useRef<any>();

  const handleSliceStateChange = useCallback(() => {
    const nextState = selector({ get: getSliceState });
    if (checkEquallity(prevState, nextState)) return;

    prevState.current = nextState;
    rerender();
  }, [selector]);

  const getSliceState = useCallback(
    <S extends SliceMeta<any>>(slice: S): StateOfSlice<S> => {
      context.observeSlice(slice, handleSliceStateChange);
      return context.getStateOfSlice(slice);
    },
    [handleSliceStateChange]
  );

  if (prevState.current == null) {
    prevState.current = selector({ get: getSliceState });
  }

  return prevState.current;
};
