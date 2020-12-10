import { render } from "@testing-library/react";
import React, { createRef, forwardRef, useImperativeHandle } from "react";
import { act } from "react-dom/test-utils";
import { LysProvider, createLysContext } from ".";
import {
  createVolatileSlice,
  useVolatileSliceRoot,
  useVolatileSlice,
} from "./useVolatileState";

describe("useVolatileState", () => {
  it("test", async () => {
    const slice = createVolatileSlice(
      {
        increment(draft) {
          draft.count++;
        },
      },
      () => ({ count: 0 })
    );

    const context = createLysContext();
    const rootRef = createRef<any>();
    const subRef = createRef<any>();

    const App: React.FC = ({ children }) => (
      <LysProvider value={context}>{children}</LysProvider>
    );

    const RootComponent = forwardRef((_, ref) => {
      const [state, actions] = useVolatileSliceRoot(slice);

      useImperativeHandle(
        ref,
        () => ({
          increment: () => actions.increment(),
        }),
        [actions]
      );

      return (
        <div>
          <div>Root: {state.count}</div>
          <SubComponent ref={subRef} />
        </div>
      );
    });

    const SubComponent = forwardRef((_, ref) => {
      const [state, actions] = useVolatileSlice(slice);

      useImperativeHandle(
        ref,
        () => ({
          increment: () => actions.increment(),
        }),
        [actions]
      );

      return <div>Sub: {state.count}</div>;
    });

    const element = (
      <App>
        <RootComponent ref={rootRef} />
      </App>
    );

    const result = render(element);

    // Initial State
    expect(result.container.innerHTML).toMatchInlineSnapshot(
      `"<div><div>Root: 0</div><div>Sub: 0</div></div>"`
    );

    // First update
    await act(async () => {
      rootRef.current.increment();
      await new Promise(requestAnimationFrame);
    });

    result.rerender(element);
    expect(result.container.innerHTML).toMatchInlineSnapshot(
      `"<div><div>Root: 1</div><div>Sub: 1</div></div>"`
    );

    // Second update
    await act(async () => {
      rootRef.current.increment();
      await new Promise(requestAnimationFrame);
    });

    result.rerender(element);
    expect(result.container.innerHTML).toMatchInlineSnapshot(
      `"<div><div>Root: 2</div><div>Sub: 2</div></div>"`
    );

    // Third update by SubComponent
    await act(async () => {
      subRef.current.increment();
      await new Promise(requestAnimationFrame);
    });

    result.rerender(element);
    expect(result.container.innerHTML).toMatchInlineSnapshot(
      `"<div><div>Root: 3</div><div>Sub: 3</div></div>"`
    );
  });
});
