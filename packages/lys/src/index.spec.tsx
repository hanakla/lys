import React from "react";
import { render } from "@testing-library/react";
import { useCallback } from "react";
import { createLysContext, createSlice, LysContext } from "./index";

const slice = createSlice("slice", () => ({ flag: false }), {
  getUser() {},
});

describe("lys", () => {
  describe("", () => {
    const Component = () => {
      // const ctx = useLys();

      const handle = useCallback(() => {
        // ctx.execAction();
      }, []);

      return <div onClick={handle} />;
    };

    it("render", () => {
      const context = createLysContext();
      const result = render(
        <LysContext value={context}>
          <Component />
        </LysContext>
      );
    });
  });
});
