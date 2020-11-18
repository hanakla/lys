import React from "react";
import { renderHook } from "@testing-library/react-hooks";
import { createLysContext, LysContext, LysContextProvider } from "./context";
import { createSlice } from "./slice";
import { SliceSelector, useSliceSelector } from "./useSlice";

describe("useSlice", () => {
  const slice = createSlice("slice", () => ({ count: 1 }), {
    async increment({ state }) {
      await new Promise((resolve) => setTimeout(resolve, 100));
      state.count++;

      return state.count;
    },
    async getUser({ get, state }, userId: string) {
      const user = { id: "1", name: "hanakla" };
      return { user };
    },
  });

  const incrementSelector: SliceSelector = ({ get }) => get(slice);

  const wrap = (context: LysContext) => ({ children }) => (
    <LysContextProvider value={context}>{children}</LysContextProvider>
  );

  describe("useSliceSelector", () => {
    it("test", () => {
      const context = createLysContext();

      const result = renderHook(() => useSliceSelector(incrementSelector), {
        wrapper: wrap(context),
      });

      console.log(result.result.current);
    });
  });
});
