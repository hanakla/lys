import { useFetch } from "./useFetch";

describe.skip("useFetch", () => {
  it("test", () => {
    const Comp = () => {
      const { data } = useFetch("/api/users/1", { fetcher: fetch });
    };
  });
});
