import { describe, expect, it } from "vitest";

import { accessOf, joinModeOf } from "./access";
import { channelName, CHANNEL_NAME_MAX } from "./channel-name";
import { SQUAD_TEMPLATES, TEMPLATE_KEYS } from "./templates";

describe("channelName", () => {
  it("lower-cases and joins words with single hyphens", () => {
    expect(channelName("  Mock Tests!! ")).toBe("mock-tests");
    expect(channelName("Kerala -- History")).toBe("kerala-history");
  });

  it("keeps letters of any script", () => {
    expect(channelName("മലയാളം പഠനം")).toBe("മലയാളം-പഠനം");
  });

  it("is empty when nothing usable is left", () => {
    expect(channelName("!!! ---")).toBe("");
  });

  it("never ends on a hyphen after cutting to length", () => {
    const name = channelName(`${"a".repeat(CHANNEL_NAME_MAX - 1)} b`);
    expect(name.length).toBeLessThanOrEqual(CHANNEL_NAME_MAX);
    expect(name.endsWith("-")).toBe(false);
  });
});

describe("squad templates", () => {
  it("only hold valid, unique channel names", () => {
    for (const key of TEMPLATE_KEYS) {
      const names = SQUAD_TEMPLATES[key].categories.flatMap((c) =>
        c.channels.map((ch) => ch.name),
      );
      for (const name of names) expect(channelName(name)).toBe(name);
      expect(new Set(names).size).toBe(names.length);
    }
  });
});

describe("squad access", () => {
  it("reads one choice back from what is stored", () => {
    expect(accessOf({ visibility: "PUBLIC", joinMode: "OPEN" })).toBe("OPEN");
    expect(accessOf({ visibility: "PUBLIC", joinMode: "REQUEST" })).toBe("ASK");
    expect(accessOf({ visibility: "PRIVATE", joinMode: "REQUEST" })).toBe(
      "PRIVATE",
    );
    expect(accessOf({ visibility: "PRIVATE", joinMode: "OPEN" })).toBe(
      "PRIVATE",
    );
    expect(accessOf({ visibility: "PUBLIC", joinMode: "INVITE_ONLY" })).toBe(
      "INVITE",
    );
  });

  it("never lets a private squad be open", () => {
    expect(joinModeOf({ visibility: "PRIVATE", joinMode: "OPEN" })).toBe(
      "REQUEST",
    );
  });
});
