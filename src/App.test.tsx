import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import App from "./App";

describe("Sondera foundation", () => {
  it("shows the four-step journey and the privacy limitation", () => {
    render(<App />);
    expect(screen.getByRole("heading", { name: /know what you know/i })).toBeTruthy();
    expect(screen.getByRole("navigation", { name: /investigation steps/i })).toBeTruthy();
    expect(screen.getByText(/automated checks can miss threats/i)).toBeTruthy();
    expect(screen.getByText(/does not send it anywhere/i)).toBeTruthy();
  });
});
