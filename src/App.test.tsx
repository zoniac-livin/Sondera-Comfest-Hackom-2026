import { describe, expect, it } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import App from "./App";

describe("Sondera Submit and Inspect", () => {
  it("shows the two working steps, simple wordmark header, and six examples", () => {
    render(<App />);
    expect(screen.getByRole("link", { name: /sondera/i })).toBeTruthy();
    expect(screen.getByText(/know what you know/i)).toBeTruthy();
    expect(screen.getByRole("navigation", { name: /investigation steps/i })).toBeTruthy();
    expect(screen.getByRole("textbox", { name: /message, link or claim/i })).toBeTruthy();
    expect(screen.getAllByRole("button").filter((button) => button.classList.contains("example-button"))).toHaveLength(6);
    expect(screen.getByText(/automated checks can miss threats/i)).toBeTruthy();
  });

  it("uses the real engine and shows evidence, sorted severity, unknowns, and explanations", async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole("button", { name: /bank kyc text/i }));
    await user.click(screen.getByRole("button", { name: /inspect input/i }));

    expect(screen.getByRole("heading", { name: /what the local checks observed/i })).toBeTruthy();
    expect(screen.getByText("Brand name in the main domain")).toBeTruthy();
    expect(screen.getByText("Claims to speak for an organization")).toBeTruthy();
    expect(screen.getByRole("heading", { name: /what we could not check/i })).toBeTruthy();
    expect(screen.getByText(/live domain reputation/i)).toBeTruthy();
    expect(screen.getAllByText(/automated checks can miss threats/i)).toHaveLength(2);

    const cards = screen.getAllByText(/Brand name in the main domain|Claims to speak for an organization/);
    expect(cards.length).toBe(2);
    const marks = document.querySelectorAll(".evidence-mark");
    expect(marks.length).toBeGreaterThan(0);
    expect(marks[0].querySelector("svg")).not.toBeNull();
    expect(screen.getAllByText("High", { selector: ".severity-label" }).length).toBeGreaterThan(0);
    const visibleSeverities = Array.from(document.querySelectorAll(".indicator-card .severity-label"))
      .map((node) => node.textContent?.trim());
    const severityRank = { High: 0, Medium: 1, Low: 2, Info: 3 };
    expect(visibleSeverities).toEqual([...visibleSeverities].sort((left, right) => severityRank[left as keyof typeof severityRank] - severityRank[right as keyof typeof severityRank]));

    const brandCard = screen.getByText("Brand name in the main domain").closest("details");
    expect(brandCard).not.toBeNull();
    await user.click(within(brandCard!).getByText("Details"));
    expect(within(brandCard!).getByText(/complete domain label token/i)).toBeTruthy();
  });

  it("allows input type override and benign messages can produce no indicators", async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole("button", { name: /normal message/i }));
    await user.click(screen.getByRole("radio", { name: /url web address/i }));
    await user.click(screen.getByRole("button", { name: /inspect input/i }));
    expect(screen.getByText(/STEP 02 \/ 04 · URL/i)).toBeTruthy();
    expect(screen.getByText("No indicators found")).toBeTruthy();
    expect(screen.getByText(/these local checks found no indicators/i)).toBeTruthy();
  });
});
