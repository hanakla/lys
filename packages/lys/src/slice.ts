import { createDraft, Draft, finishDraft } from "immer";
import { ObjectPatcher, patchObject } from "./patchObject";
import { DeepReadonly } from "./typeutils";
import { shallowEqual } from "./utils";

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
      /** It is recommended that the conditional branch does not change whether or not it is executed. */
      unstable_execAction: ExecAction<State>;
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
  state: { readonly current: StateOfSlice<S> & SliceToComputeds<S> };
  actions: SliceToActions<S>;
  dispose: () => void;
};

type ExtraActionArgs<T> = T extends (_: any, ...args: infer R) => any
  ? R
  : never;

type ExecAction<State> = <A extends SliceAction<State>>(
  action: A,
  ...args: ExtraActionArgs<A>
) => Promise<void>;

// prettier-ignore
export type SliceToActions<S extends Slice<any, any>> = {
  [K in keyof S["actions"]]:
    ReturnType<S["actions"][K]> extends void | undefined ? (...args: ExtraActionArgs<S['actions'][K]>) => void
    : ReturnType<S["actions"][K]> extends Promise<any> ? (...args: ExtraActionArgs<S['actions'][K]>) => Promise<void>
    : never;
} & {
  /** @param applier Shallow merging object or modifier function */
  set(applier: ObjectPatcher<Draft<StateOfSlice<S>>>): void;
  /** @param k Field name to reset to initial state, no specified to reset all fields */
  reset(k?: keyof StateOfSlice<S>): void;
};

export type SliceToComputeds<S extends Slice<any, any>> = {
  [K in keyof S["computables"]]: ReturnType<S["computables"][K]>;
};

export const createSlice = <S, VDef extends SliceDefinition<S>>(
  sliceDef: VDef,
  initialStateFactory: () => S
): Slice<S, VDef> => {
  const { computed = {} as any, actions } = sliceDef;
  return { initialStateFactory, actions, computables: computed };
};

class ActionSuspended {
  constructor(public action: SliceAction<any>, public args: any[]) {}
}

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

  const computedResultCache = new Map();
  let latestReferencedState: any = null;
  const computableProperties: Record<
    string,
    PropertyDescriptor
  > = Object.create(null);

  const updateState = (nextState: StateOfSlice<S>) => {
    state.current = Object.defineProperties(
      { ...nextState }, // Strip computed properties
      computableProperties
    );
  };

  const internalExecAction = async (
    action: SliceAction<any>,
    args: any[],
    emitChange: boolean
  ) => {
    let nestedExecuted: Array<[SliceAction<any>, any[]]> = [];
    let executeIndex = -1;

    const nestedExecAction: ExecAction<StateOfSlice<S>> = async (
      action,
      ...args
    ) => {
      executeIndex++;
      const currentExecute = nestedExecuted[executeIndex];

      if (
        currentExecute?.[0] === action &&
        shallowEqual(currentExecute?.[1], args)
      ) {
        return;
      }

      nestedExecuted[executeIndex] = [action, args];
      throw new ActionSuspended(action, args);
    };

    while (true) {
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
        updateState(nextState);
        emitChange && changed?.(nextState);
      };

      try {
        executeIndex = -1;

        const result = action(
          { draft, updateTemporary, unstable_execAction: nestedExecAction },
          ...args
        );

        if (result instanceof Promise) {
          await result;
        }

        const nextState = finishDraft(draft);
        updateState(nextState);
        emitChange && changed?.(nextState);

        break;
      } catch (e) {
        finishDraft(draft);

        if (e instanceof ActionSuspended) {
          await internalExecAction(e.action, e.args, false);
        } else {
          throw e;
        }
      }
    }
  };

  const execAction = async (action: SliceAction<any>, ...args: any[]) => {
    await internalExecAction(action, args, true);
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

  Object.keys(slice.computables ?? {}).forEach((key) => {
    computableProperties[key] = {
      enumerable: true,
      configurable: false,
      get: () => {
        // Check state object change by immer
        if (state.current === latestReferencedState) {
          return computedResultCache.get(slice.computables[key]);
        }

        const result = slice.computables[key](state.current);
        computedResultCache.set(slice.computables[key], result);
        return result;
      },
    };
  });

  const dispose = () => {
    computedResultCache.clear();
    latestReferencedState = null;
  };

  state.current = Object.defineProperties(state.current, computableProperties);

  return {
    state,
    actions: proxyActions,
    dispose,
  };
};
