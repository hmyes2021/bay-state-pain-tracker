import { useState } from "react";
import { describe, expect, it } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { PainScale } from "@/features/pain/PainScale";
import { BodyMap } from "@/features/pain/BodyMap";

function Scale() { const [v, setV] = useState<number>(); return <PainScale value={v} onChange={setV} />; }
function Map() { const [v, setV] = useState<string[]>([]); return <BodyMap value={v} onChange={setV} />; }

describe("PainScale", () => {
  it("selects with one tap and moves with arrow keys", () => {
    render(<Scale />);
    fireEvent.click(screen.getByRole("radio", { name: /^5,/ }));
    expect(screen.getByRole("radio", { name: /^5,/ })).toHaveAttribute("aria-checked", "true");
    fireEvent.keyDown(screen.getByRole("radiogroup"), { key: "ArrowRight" });
    expect(screen.getByRole("radio", { name: /^6,/ })).toHaveAttribute("aria-checked", "true");
    fireEvent.keyDown(screen.getByRole("radiogroup"), { key: "Home" });
    expect(screen.getByRole("radio", { name: /^0,/ })).toHaveAttribute("aria-checked", "true");
  });
});

describe("BodyMap", () => {
  it("toggles regions by click and keyboard, and switches views", () => {
    render(<Map />);
    fireEvent.click(screen.getByRole("checkbox", { name: "Chest" }));
    expect(screen.getByRole("button", { name: "Remove Chest" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("radio", { name: "Back" }));
    const lower = screen.getByRole("checkbox", { name: "Lower back" });
    fireEvent.keyDown(lower, { key: "Enter" });
    expect(lower).toHaveAttribute("aria-checked", "true");
    fireEvent.click(screen.getByRole("button", { name: "Remove Chest" }));
    expect(screen.queryByRole("button", { name: "Remove Chest" })).toBeNull();
  });
});
