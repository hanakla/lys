import { createLysContext } from "./context";
import { createSlice } from "./slice";

describe("slice", () => {
  const slice = createSlice("slice", () => ({ count: 0, executed: false }), {
    increment({ state, get }, amount: number = 1) {
      state.count += amount;
    },
    decrement({ state }, amount: number = 1) {
      state.count -= amount;
    },
    async execTest({ get }) {
      await get(slice._realExec);
    },
    _realExec({ state }) {
      state.executed = true;
    },
  });

  it("should change state", async () => {
    const context = createLysContext();

    await context.execAction(slice.increment);
    expect(context.dehydrate().state.slice.count).toBe(1);

    await context.execAction(slice.decrement);
    expect(context.dehydrate().state.slice.count).toBe(0);
  });

  it("should passes extra arguments", async () => {
    const context = createLysContext();

    await context.execAction(slice.increment, 2);
    expect(context.dehydrate().state.slice.count).toBe(2);
  });

  it.skip("Should change `executed` flag via exeAction call", async () => {
    const context = createLysContext();

    // Mount slice before read
    context.getStateOfSlice(slice);

    expect(context.dehydrate().state.slice.executed).toBe(false);
    await context.execAction(slice.execTest);
    expect(context.dehydrate().state.slice.executed).toBe(true);
  });
});
