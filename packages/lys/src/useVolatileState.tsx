import { useCallback, useContext, useMemo, useReducer, useRef } from "react";
import { createDraft, finishDraft } from "immer";
import { InternalLysContext } from "./context";
import { IS_SERVER, useIsomorphicLayoutEffect } from "./utils";
import { VolatileReactContext } from "./VolatileContext";

export type VolatileSliceDefinition<T> = {
  [K: string]: (draft: T, ...args: any[]) => void | Promise<void>;
};

type VolatileSliceToActions<Def extends VolatileSliceDefinition<any>> = {
  [K in keyof Def]: Def[K] extends (
    draft: any,
    ...args: infer R
  ) => void | Promise<void>
    ? (...args: R) => void | Promise<void>
    : never;
};

export type VolatileSlice<S, Def extends VolatileSliceDefinition<any>> = {
  initialStateFactory: () => S;
  actions: Def;
};

type StateOfVolatileSlice<
  T extends VolatileSlice<any, any>
> = T extends VolatileSlice<infer S, any> ? S : never;

export const createVolatileSlice = <S, VDef extends VolatileSliceDefinition<S>>(
  actions: VDef,
  initialStateFactory: () => S
): VolatileSlice<S, VDef> => {
  return { initialStateFactory, actions };
};

const useVolatileContext = () => {
  const lysContext = useContext(InternalLysContext);
  const volatileContext =
    lysContext?.volatileContext ?? useContext(VolatileReactContext);

  if (!volatileContext) {
    throw new Error(
      "Lys Volatile: LysContext or VolatileProvider must be placed of top of useVolatileSlice"
    );
  }

  return volatileContext;
};

const useVolatileSliceInternal = <V extends VolatileSlice<any, any>>(
  volatile: V,
  { initialize }: { initialize: boolean } = { initialize: true }
) => {
  const volatileContext = useVolatileContext();
  const isFirstRendering = useRef(true);

  if (!initialize && !volatileContext.hasVolatileState(volatile)) {
    throw new Error(
      `Lys Volatile: Volatile must be initialized in upper tree Component with \`useVolatileSliceRoot(volatile)\``
    );
  }

  if (
    isFirstRendering.current &&
    initialize &&
    volatileContext.hasVolatileState(volatile)
  ) {
    throw new Error(
      "Lys Volatile: Volatile is already initalized in upper tree"
    );
  }

  const [, rerender] = useReducer((s) => s + 1, 0);
  const state: StateOfVolatileSlice<V> =
    volatileContext.getVolatileState(volatile) ??
    volatileContext.setVolatileState(
      volatile,
      finishDraft(createDraft(volatile.initialStateFactory()))
    );

  const execAction = useCallback(
    async (action: any, ...args: any[]) => {
      if (IS_SERVER) {
        throw new Error(
          "Lys Volatile: Volatile action can not execute in Server environment"
        );
      }

      const prevState = volatileContext.getVolatileState(volatile);
      const draft = createDraft(prevState);
      const result = action(draft, ...args);

      // keep input element value under the controlled.
      // If awaiting in text input process, input is changed to uncontrolled input.
      if (result instanceof Promise) {
        await result;
      }
      const nextState = finishDraft(draft);

      volatileContext.setVolatileState(volatile, nextState);
      rerender();
    },
    [volatile]
  );

  const actions = useMemo(() => {
    const proxyActions: any = {};

    Object.keys(volatile.actions).forEach((key) => {
      proxyActions[key] = (...args: any) => {
        execAction(volatile.actions[key], ...args);
      };
    });

    return proxyActions as VolatileSliceToActions<V["actions"]>;
  }, [volatile.actions]);

  useIsomorphicLayoutEffect(() => {
    // Observe update only in volatile root
    if (!initialize) return;

    volatileContext.observeVolatileStateUpdate(volatile, rerender);
    return () => {
      volatileContext.unsetVolatile(volatile);
    };
  }, [volatile, volatileContext]);

  isFirstRendering.current = false;
  return [state, actions] as const;
};

export const useVolatileSliceRoot = <S extends VolatileSlice<any, any>>(
  volatile: S
) => {
  return useVolatileSliceInternal(volatile, { initialize: true });
};

export const useVolatileSlice = <S extends VolatileSlice<any, any>>(
  volatile: S
) => {
  return useVolatileSliceInternal(volatile, { initialize: false });
};
