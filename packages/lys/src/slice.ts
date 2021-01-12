import { createDraft, Draft, finishDraft } from "immer";
import { ObjectPatcher, patchObject } from "./patchObject";
import { DeepReadonly } from "./typeutils";

export type SliceDefinition<State> = {
  actions: {
    [K: string]: SliceAction<State>;
  };
  computed?: {
    [K: string]: SliceComputable<State>;
  };
};

export type SliceComputable<State> = {
  (state: DeepReadonly<State>): any;
};

export type SliceAction<State> = {
  (
    context: {
      draft: Draft<State>;
      /**
       * Update state and emit changes temporary.
       */
      updateTemporary: (patcher: ObjectPatcher<Draft<State>>) => void;
    },
    ...args: any[]
  ): void | Promise<void>;
};

export type Slice<State, SDef extends SliceDefinition<any>> = {
  initialStateFactory: () => State;
  actions: SDef["actions"];
  computables: SDef["computed"] extends undefined | void
    ? {}
    : SDef["computed"];
};

export type StateOfSlice<T extends Slice<any, any>> = T extends Slice<
  infer State,
  any
>
  ? State
  : never;

export type SliceInstance<S extends Slice<any, any>> = {
  state: { readonly current: StateOfSlice<S> };
  actions: SliceToActions<S>;
  computed: SliceToComputers<S>;
  dispose: () => void;
};

export type SliceToActions<S extends Slice<any, any>> = {
  [K in keyof S["actions"]]: S["actions"][K] extends (
    draft: any,
    ...args: infer R
  ) => void | Promise<void>
    ? (...args: R) => void | Promise<void>
    : never;
} & {
  /** @param applier Shallow merging object or modifier function */
  set(applier: ObjectPatcher<Draft<StateOfSlice<S>>>): void;
  /** @param k Field name to reset to initial state, no specified to reset all fields */
  reset(k?: keyof StateOfSlice<S>): void;
};

export type SliceToComputers<S extends Slice<any, any>> = {
  [K in keyof S["computables"]]: () => ReturnType<S["computables"][K]>;
};

export const createSlice = <S, VDef extends SliceDefinition<S>>(
  sliceDef: VDef,
  initialStateFactory: () => S
): Slice<S, VDef> => {
  const { computed = {} as any, actions } = sliceDef;
  return { initialStateFactory, actions, computables: computed };
};

export const instantiateSlice = <S extends Slice<any, any>>(
  slice: S,
  initialState?: ObjectPatcher<Draft<StateOfSlice<S>>> | null,
  changed?: (state: StateOfSlice<S>) => void
): SliceInstance<S> => {
  const baseInitial = slice.initialStateFactory();
  const initial = initialState
    ? patchObject(baseInitial, initialState)
    : baseInitial;

  const state = {
    current: initial,
  };

  const execAction = async (action: SliceAction<any>, ...args: any[]) => {
    const base = state.current;
    const draft = createDraft(base);

    const updateTemporary = (
      patcher: ObjectPatcher<Draft<StateOfSlice<any>>>
    ) => {
      const tmpDraft = createDraft(base);
      patchObject(tmpDraft, patcher);

      // Won't do this. When use destructive assignment by draft
      // destructed property is not update and desync from base draft, it makes confusing
      // // patchObject(draft, patcher);

      const nextState = finishDraft(tmpDraft);
      state.current = nextState;
      changed?.(nextState);
    };

    const result = action({ draft, updateTemporary }, ...args);

    if (result instanceof Promise) {
      await result;
    }

    const nextState = finishDraft(draft);
    state.current = nextState;
    changed?.(nextState);
  };

  const proxyActions: any = {};
  Object.keys(slice.actions).forEach((key) => {
    proxyActions[key] = (...args: any) => {
      return execAction(slice.actions[key], ...args);
    };
  });

  (proxyActions as SliceToActions<S>).set = (patcher) => {
    execAction(({ draft }) => patchObject(draft, patcher));
  };
  (proxyActions as SliceToActions<S>).reset = (k?) => {
    execAction(({ draft }) => {
      const initial = slice.initialStateFactory();
      Object.assign(draft, k != null ? { [k]: initial[k] } : initial);
    });
  };

  const proxyComputables: any = {};
  const computedCache = new Map();
  let latestState: any = null;
  Object.keys(slice.computables ?? {}).forEach((key) => {
    Object.defineProperty(proxyComputables, key, {
      enumerable: true,
      get: () => {
        // Check state object change by immer
        if (state.current === latestState) {
          return computedCache.get(slice.computables[key]);
        }

        const result = slice.computables[key](state.current);
        computedCache.set(slice.computables[key], result);
        return result;
      },
    });
  });

  const dispose = () => {
    computedCache.clear();
    latestState = null;
  };

  return {
    state,
    actions: proxyActions,
    computed: proxyComputables,
    dispose,
  };
};
