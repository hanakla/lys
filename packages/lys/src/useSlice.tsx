import { useCallback, useContext, useMemo, useReducer, useRef } from "react";
import { Draft } from "immer";
import { Slice, StateOfSlice } from "./slice";
import { LysReactContext } from "./LysContext";
import { shallowEqual, useIsomorphicLayoutEffect } from "./utils";
import { ObjectPatcher } from "./patchObject";

const useLysContext = () => {
  const lysContext = useContext(LysReactContext);

  if (!lysContext) {
    throw new Error(
      "Lys: LysContext must be placed of top of useLysSliceRoot or useLysSlice"
    );
  }

  return lysContext;
};

const useLysSliceInternal = <S extends Slice<any, any>>(
  slice: S,
  initialState?: ObjectPatcher<Draft<StateOfSlice<S>>> | null,
  { isRoot = true }: { isRoot?: boolean } = {}
) => {
  const lysContext = useLysContext();
  const isFirstRendering = useRef(true);
  const initialStateLoaded = useRef(initialState != null);

  if (!isRoot && !lysContext.hasSliceInstance(slice)) {
    throw new Error(
      `Lys: Slice must be initialized in upper tree Component with \`useLysSliceRoot(slice)\``
    );
  }

  if (
    isFirstRendering.current &&
    isRoot &&
    lysContext.hasSliceInstance(slice)
  ) {
    console.warn(
      "Lys: Slice is already initalized in upper tree. Ignore this if you are using StrictMode"
    );
  }

  const [, rerender] = useReducer((s) => s + 1, 0);
  const prevStateRef = useRef<StateOfSlice<S> | null>(null);

  const instance = useMemo(
    () =>
      lysContext.getSliceInstance(slice) ??
      lysContext.createSliceInstance(slice, initialState),
    [slice]
  );

  const checkAndRerender = useCallback(() => {
    if (shallowEqual(prevStateRef.current, instance.state.current)) return;
    prevStateRef.current = instance.state.current;
    rerender();
  }, []);

  // Observe update only in root (for reduce re-rendering)
  useIsomorphicLayoutEffect(() => {
    if (!isRoot) return;

    lysContext.observeSliceUpdate(slice, checkAndRerender);
    return () => lysContext.unobserveSliceUpdate(slice);
  }, [slice]);

  // Unset slice instance when root is unmounted
  useIsomorphicLayoutEffect(() => {
    if (!isRoot) return;
    return () => {
      instance.dispose();
      lysContext.unsetSliceInstance(slice);
    };
  }, []);

  useIsomorphicLayoutEffect(() => {
    if (initialStateLoaded.current || initialState == null) {
      return;
    }

    instance.actions.set(initialState);
    initialStateLoaded.current = true;
  }, [initialState]);

  isFirstRendering.current = false;
  return [instance.state.current, instance.actions] as const;
};

export const useLysSliceRoot = <S extends Slice<any, any>>(
  slice: S,
  initialState?: ObjectPatcher<Draft<StateOfSlice<S>>> | null
) => {
  return useLysSliceInternal(slice, initialState, { isRoot: true });
};

export const useLysSlice = <S extends Slice<any, any>>(slice: S) => {
  return useLysSliceInternal(slice, null, { isRoot: false });
};
