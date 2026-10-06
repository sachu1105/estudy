import { describe, expect, it } from "vitest";

import { toPrefixQuery } from "./search";

describe("pod search queries", () => {
  it("turns words into prefix matches and drops query syntax", () => {
    expect(toPrefixQuery("Kerala renaiss")).toBe("kerala:* & renaiss:*");
    expect(toPrefixQuery("a' | b & !c:*")).toBe("a:* & b:* & c:*");
    expect(toPrefixQuery("കേരള നദികൾ")).toBe("കേരള:* & നദികൾ:*");
    expect(toPrefixQuery("  !!! ")).toBeNull();
  });
});
