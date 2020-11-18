import { Draft } from "immer";

type SliceContext<S> = {
  state: Draft<S>;
  get<T extends Action<any>>(action: T, ...args: ArgsOfAction<T>): Promise<any>;
};

type SliceDefinition<State> = {
  [actionName: string]: ActionDef<State>;
};

type ActionDef<State> = (
  context: SliceContext<State>,
  ...args: any[]
) => any | Promise<any>;

// prettier-ignore
export type StateOfSlice<
  T
> = T extends SliceDefinition<infer S> ? S
  : T extends SliceMeta<infer R>　? (R extends SliceDefinition<infer S> ? S : never)
  : never;

export interface Action<Args extends unknown[]> {
  (context: SliceContext<any>, ...args: Args): any | Promise<any>;
  __$slice: Slice<any>;
}

export interface SliceMeta<SliceDef extends SliceDefinition<any>> {
  readonly __$stateFactory: () => StateOfSlice<SliceDef>;
  readonly __$sliceKey: string;
}

export type Slice<SliceDef extends SliceDefinition<any>> = SliceMeta<SliceDef> &
  {
    [K in keyof SliceDef]: Action<ArgsOfAction<SliceDef[K]>>;
  };

export type ArgsOfAction<T> = T extends (
  context: SliceContext<any>,
  ...args: infer R
) => void | Promise<void>
  ? R
  : never;

export const createSlice = <State, Def extends SliceDefinition<State>>(
  key: string,
  initialStateFactory: () => State,
  defs: Def
): Slice<Def> => {
  const slice: Slice<Def> = {
    __$sliceKey: key,
    __$stateFactory: initialStateFactory,
  } as any;

  Object.keys(defs).forEach((key) => {
    const action = defs[key] as Action<any>;
    action.__$slice = slice;

    // 循環参照になりそうだけど、実行時にたかだかSlice数しか実行されないはずなので許容する
    slice[key as keyof Def] = action as any;
  });

  return slice;
};
