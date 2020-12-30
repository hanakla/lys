import { createSlice, instantiateSlice } from "./slice";

const wait = (ms: number) =>
  new Promise<void>((resolve) => setTimeout(resolve, ms));

describe("slice", () => {
  interface State {
    submitting: boolean;
    form: { name: string };
  }

  const slice = createSlice(
    {
      async submit({ draft, updateTemporary }) {
        updateTemporary({ submitting: true });
        await wait(1000);
        draft.submitting = false;
      },
    },
    (): State => ({ submitting: false, form: { name: "" } })
  );

  beforeEach(() => {
    jest.useFakeTimers();
  });

  describe("builtin actions", () => {
    describe("set", () => {
      it("object style", () => {
        const { state, actions } = instantiateSlice(slice);

        actions.set({ submitting: true });
        expect(state.current.submitting).toBe(true);
      });

      it("patch function style", () => {
        const { state, actions } = instantiateSlice(slice);

        actions.set((draft) => (draft.form.name = "Hanakla-san"));
        expect(state.current.form.name).toBe("Hanakla-san");
      });
    });

    describe("reset", () => {
      it("without key", () => {
        const { state, actions } = instantiateSlice(slice, {
          form: { name: "aaa" },
        });

        actions.reset();
        expect(state.current.form.name).toBe("");
      });

      it("with key", async () => {
        const { state, actions } = instantiateSlice(slice, {
          submitting: true,
          form: { name: "aaa" },
        });

        actions.reset("submitting");
        expect(state.current.submitting).toBe(false);
        expect(state.current.form.name).toBe("aaa"); // Expect not to change
      });
    });
  });

  describe("changeImmediate", () => {
    it("it works", async () => {
      const { state, actions } = instantiateSlice(slice);

      expect(state.current.submitting).toBe(false);
      const promise = actions.submit();
      expect(state.current.submitting).toBe(true);

      jest.runAllTimers();
      await promise;
      await promise;
      expect(state.current.submitting).toBe(false);
    });
  });
});
