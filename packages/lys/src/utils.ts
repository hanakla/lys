import { useEffect, useLayoutEffect } from "react";

export const IS_SERVER =
  typeof window === "undefined" ||
  // @ts-ignore
  !!(typeof Deno !== "undefined" && Deno && Deno.version && Deno.version.deno);

export const useIsomorphicLayoutEffect = IS_SERVER
  ? useEffect
  : useLayoutEffect;
