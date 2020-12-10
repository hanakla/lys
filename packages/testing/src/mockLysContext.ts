import { LysContext } from "@fleur/lys";

export const mockLysContext = (): LysContext => {
  return new LysContext();
};

class MockLysContext {
  derive();
}
