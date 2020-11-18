import { createDraft, finishDraft } from "immer";
import { createContext, useContext } from "react";
import { Action, ArgsOfAction, SliceMeta, StateOfSlice } from "./slice";
import { Slice } from "./slice";

export class LysContext {
  private slices = new Map<string, Slice<any>>();
  private sliceStates = new Map<string, any>();
  private observers = new Map<string, Set<any>>();

  public execAction = async <T extends Action<any>>(
    action: T,
    ...args: ArgsOfAction<T>
  ): Promise<void> => {
    const slice = this.getOrMountSlice(action.__$slice);
    const state = this.sliceStates.get(slice.__$sliceKey);
    const draft = createDraft(state);

    await action({ get: this.execAction, state: draft }, ...(args as any[]));

    this.sliceStates.set(slice.__$sliceKey, finishDraft(draft));
    this.observers.get(slice.__$sliceKey)?.forEach((observer) => observer());
  };

  public getStateOfSlice<S extends SliceMeta<any>>(slice: S): StateOfSlice<S> {
    const storedSlice = this.getOrMountSlice((slice as unknown) as Slice<any>);
    return this.sliceStates.get(storedSlice.__$sliceKey);
  }

  public getOrMountSlice(slice: Slice<any>) {
    const storedSlice = this.slices.get(slice.__$sliceKey);

    if (!storedSlice) {
      this.slices.set(slice.__$sliceKey, slice);
      this.sliceStates.set(slice.__$sliceKey, slice.__$stateFactory());
      return slice;
    }

    if (storedSlice !== slice) {
      throw new Error(`Slice key ${storedSlice?.__$sliceKey} is duplicated`);
    }

    return storedSlice;
  }

  public observeSlice(slice: SliceMeta<any>, observer: () => void) {
    const observers = this.observers.get(slice.__$sliceKey) ?? new Set();
    observers.add(observer);
    this.observers.set(slice.__$sliceKey, observers);
  }

  public unobserveSlice(slice: SliceMeta<any>, observer: () => void) {
    const observers = this.observers.get(slice.__$sliceKey) ?? new Set();
    observers.delete(observer);
  }

  public dehydrate() {
    const hydrateState = { state: {} as any };

    this.sliceStates.forEach((state, key) => {
      hydrateState.state[key] = state;
    });

    return hydrateState;
  }

  public rehydrate(hydrateState: any) {
    Object.keys(hydrateState.stores).forEach((key) => {
      this.sliceStates.set(key, hydrateState.stores[key]);
    });
  }
}

const InternalLysContext = createContext<LysContext | null>(null);

export const createLysContext = () => {
  return new LysContext();
};

export const useLysContext = () => {
  const context = useContext(InternalLysContext);

  if (!context) {
    throw new Error("LysContext must be placed of top of useLysContext");
  }

  return context;
};

export const LysContextProvider = InternalLysContext.Provider;
