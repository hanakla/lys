import { Draft } from "immer";
import React, { createContext, useContext, useMemo } from "react";
import { ObjectPatcher } from "./patchObject";
import { instantiateSlice, Slice, SliceInstance, StateOfSlice } from "./slice";

export class LysContext {
  private slices = new Map<Slice<any, any>, SliceInstance<any>>();
  private sliceObservers = new Map<Slice<any, any>, () => void>();

  public observeSliceUpdate(slice: Slice<any, any>, callback: () => void) {
    this.sliceObservers.set(slice, callback);
  }

  public unobserveSliceUpdate(slice: Slice<any, any>) {
    this.sliceObservers.delete(slice);
  }

  private sliceChanged = (slice: Slice<any, any>) => {
    return () => {
      this.sliceObservers.get(slice)?.();
    };
  };

  public getSliceInstance<S extends Slice<any, any>>(
    slice: S
  ): SliceInstance<S> | undefined {
    return this.slices.get(slice);
  }

  public hasSliceInstance<S extends Slice<any, any>>(slice: S) {
    return this.slices.has(slice);
  }

  public createSliceInstance<S extends Slice<any, any>>(
    slice: S,
    initialState?: ObjectPatcher<Draft<StateOfSlice<S>>> | null
  ) {
    const instance = instantiateSlice(
      slice,
      initialState,
      this.sliceChanged(slice)
    );
    this.slices.set(slice, instance);
    this.sliceObservers.get(slice)?.();
    return instance;
  }

  public unsetSliceInstance(slice: Slice<any, any>) {
    this.slices.delete(slice);
    this.sliceObservers.delete(slice);
  }
}

export const LysReactContext = createContext<LysContext | null>(null);
LysReactContext.displayName = "LysContext";

export const createLysContext = () => {
  return new LysContext();
};

export const useLysContext = () => {
  const context = useContext(LysReactContext);

  if (!context) {
    throw new Error("LysContext must be placed of top of useLysContext");
  }

  return context;
};

export const LysProvider: React.FC = ({ children }) => {
  const context = useMemo(() => createLysContext(), []);

  return (
    <LysReactContext.Provider value={context}>
      {children}
    </LysReactContext.Provider>
  );
};
