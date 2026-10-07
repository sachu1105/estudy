// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { useState } from "react";
import { afterEach, describe, expect, it } from "vitest";

import { Rating } from "./rating";

const words = ["minor", "small", "medium", "big", "major"];

function Harness({ start = 2 }: { start?: number }) {
  const [value, setValue] = useState(start);
  return (
    <Rating value={value} onChange={setValue} label="Weight" words={words} />
  );
}

const checked = () =>
  screen
    .getAllByRole("radio")
    .findIndex((r) => r.getAttribute("aria-checked") === "true") + 1;

afterEach(cleanup);

describe("Rating", () => {
  it("sets the level that is tapped, and names each one", () => {
    render(<Harness />);
    expect(screen.getByRole("radiogroup", { name: "Weight" })).toBeTruthy();
    fireEvent.click(screen.getByRole("radio", { name: "4, big" }));
    expect(checked()).toBe(4);
  });

  it("moves with the arrow keys and stops at the ends", () => {
    render(<Harness start={1} />);
    const group = screen.getByRole("radiogroup");
    fireEvent.keyDown(group, { key: "ArrowLeft" });
    expect(checked()).toBe(1);
    fireEvent.keyDown(group, { key: "ArrowRight" });
    fireEvent.keyDown(group, { key: "ArrowRight" });
    expect(checked()).toBe(3);
    fireEvent.keyDown(group, { key: "End" });
    expect(checked()).toBe(5);
  });

  it("keeps one tab stop: the chosen level", () => {
    render(<Harness start={3} />);
    const tabbable = screen
      .getAllByRole("radio")
      .filter((r) => r.getAttribute("tabindex") === "0");
    expect(tabbable.map((r) => r.getAttribute("aria-label"))).toEqual([
      "3, medium",
    ]);
  });
});
