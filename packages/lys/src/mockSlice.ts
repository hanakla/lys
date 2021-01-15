import { Draft } from "immer";
import { ObjectPatcher } from "./patchObject";
import {
  Slice,
  instantiateSlice,
  StateOfSlice,
  SliceActionContext,
  SliceAction,
} from "./slice";

export const mockSlice = <S extends Slice<any, any>>(
  slice: S,
  state: ObjectPatcher<Draft<StateOfSlice<S>>> = {},
  overrides: { [K in keyof S["actions"]]?: SliceAction<StateOfSlice<S>> } = {}
) => {
  const mockSlice = { ...slice };

  Object.keys(mockSlice.actions).forEach(
    <K extends keyof typeof mockSlice.actions>(key: K) => {
      const override = overrides[key];

      mockSlice.actions[key] = override
        ? async (
            context: SliceActionContext<StateOfSlice<S>>,
            ...args: any
          ) => {
            override(context, ...args);
          }
        : mockSlice.actions[key];
    }
  );

  const instance = instantiateSlice(mockSlice);
  instance.actions.set(state);

  return { state: instance.state, actions: instance.actions };
};
