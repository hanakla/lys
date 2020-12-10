import React, { createContext, useMemo } from "react";
import { VolatileSlice } from "./useVolatileState";

export class VolatileContext {
  private volatiles = new Map<VolatileSlice<any, any>, any>();
  private volatileObservers = new Map<VolatileSlice<any, any>, () => void>();

  public observeVolatileStateUpdate(
    volatile: VolatileSlice<any, any>,
    callback: () => void
  ) {
    this.volatileObservers.set(volatile, callback);
  }

  public getVolatileState(volatile: VolatileSlice<any, any>) {
    return this.volatiles.get(volatile);
  }

  public hasVolatileState(volatile: VolatileSlice<any, any>) {
    return this.volatiles.has(volatile);
  }

  public setVolatileState(volatile: VolatileSlice<any, any>, state: any) {
    this.volatiles.set(volatile, state);
    this.volatileObservers.get(volatile)?.();
    return state;
  }

  public unsetVolatile(volatile: VolatileSlice<any, any>) {
    this.volatiles.delete(volatile);
    this.volatileObservers.delete(volatile);
  }
}

export const VolatileReactContext = createContext<VolatileContext | null>(null);

export const VolatileProvider: React.FC = ({ children }) => {
  const context = useMemo(() => new VolatileContext(), []);

  return (
    <VolatileReactContext.Provider value={context}>
      {children}
    </VolatileReactContext.Provider>
  );
};
