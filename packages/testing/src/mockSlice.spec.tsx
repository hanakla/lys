import { createSlice } from "@fleur/lys";
import { mockLysContext } from "./mockLysContext";
import { mockSlice } from "./mockSlice";

describe("mockSlice", () => {
  const slice = createSlice("Test", () => ({ text: "a" }), {
    sayHo({ state }, text: string) {
      state.text = text;
    },
  });

  it("testing", () => {
    const context = mockLysContext();
    // const mockSlice = mockSlice(slice, {});
    // context.execSelector(mockSlice.sayHo, "AAAAAAAA");
    // expect(mockSlice.state.text);
  });
});
