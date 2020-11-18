import { useMemo } from "react";
import { useIsomorphicLayoutEffect } from "./utils";

interface Fetcher {
  (url: string, option?: FetcherOption): any;
  // (url: string, ...)
}

interface FetcherOption {
  fetcher?: Fetcher;
  initialData?: any;
}

const defaultFetcher = async (url: string) => {
  return (await fetch(url)).json();
};

export const useFetch = (
  key: string,
  { fetcher = defaultFetcher, initialData }: FetcherOption
) => {
  const memoizedData = useMemo(() => initialData, [key]);

  useIsomorphicLayoutEffect(() => {
    fetcher(key);
  }, []);

  return { data: null, loading: false, error: null };
};

// export const usePost = (key: string, fetch?: Fetcher)
