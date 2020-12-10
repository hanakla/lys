import { Slice, StateOfSlice } from "@fleur/lys";

export const mockSlice = <S extends Slice<any>>(
  slice: S,
  partialState: Partial<StateOfSlice<S>> = {}
) => {
  s;
};

class MockSliceContext<S extends Slice<any>> {
  private _state: any = null;

  public get state() {
    return this._state;
  }

  constructor(private Slice: S) {
    this._state = Slice.__$stateFactory();
  }

  execSelector() {}
}
