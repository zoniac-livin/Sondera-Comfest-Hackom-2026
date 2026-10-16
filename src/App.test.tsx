import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import App from "./App";

beforeEach(() => localStorage.clear());

describe("Sondera Submit and Inspect", () => {
  it("shows the four-step journey, simple wordmark header, and seven examples", () => {
    render(<App />);
    expect(screen.getByRole("link", { name: /sondera/i })).toBeTruthy();
    expect(screen.getByText(/know what you know/i)).toBeTruthy();
    expect(screen.getByRole("navigation", { name: /investigation steps/i })).toBeTruthy();
    expect(screen.getByRole("textbox", { name: /message, link or claim/i })).toBeTruthy();
    expect(screen.getAllByRole("button").filter((button) => button.classList.contains("example-button"))).toHaveLength(7);
    expect(screen.getAllByText(/automated checks can miss threats/i).length).toBeGreaterThan(0);
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
    expect(document.querySelector(".sr-only[aria-live='polite']")?.textContent).toContain("Analysis complete");
    expect(screen.getAllByText(/automated checks can miss threats/i).length).toBeGreaterThan(0);

    const cardTitles = Array.from(document.querySelectorAll(".indicator-title")).map((node) => node.textContent);
    expect(cardTitles).toContain("Brand name in the main domain");
    expect(cardTitles).toContain("Claims to speak for an organization");
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

  it("shows the requested clean-looking domain note without elevating info-only URL notes", async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole("button", { name: /clean-looking domain/i }));
    await user.click(screen.getByRole("button", { name: /inspect input/i }));

    expect(screen.getByText("No indicators above info were found by these local checks.")).toBeTruthy();
    expect(screen.getByText("Local checks can’t judge a domain like this. Use the Missing-Proof questions to verify it yourself.")).toBeTruthy();
    expect(screen.getByText("No indicators found")).toBeTruthy();
    expect(screen.getByText(/show 1 informational observation/i)).toBeTruthy();
  });

  it("allows keyboard navigation through all four steps and gives empty states before analysis", async () => {
    const user = userEvent.setup();
    render(<App />);
    const steps = within(screen.getByRole("navigation", { name: /investigation steps/i })).getAllByRole("button");
    expect(steps).toHaveLength(4);
    expect(steps.every((step) => !(step as HTMLButtonElement).disabled)).toBe(true);

    steps[1].focus();
    await user.keyboard("{Enter}");
    expect(screen.getByRole("heading", { name: "No analysis yet" })).toBeTruthy();
    steps[2].focus();
    await user.keyboard("{Enter}");
    expect(screen.getByRole("heading", { name: "Nothing to investigate yet" })).toBeTruthy();
    steps[3].focus();
    await user.keyboard("{Enter}");
    expect(screen.getByRole("heading", { name: "Decision Receipt" })).toBeTruthy();
    expect(screen.getByText(/no analysis has been run for this case yet/i)).toBeTruthy();
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

  it("announces an empty-input error and points the user to the required field", async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole("button", { name: /inspect input/i }));
    expect(screen.getByRole("alert").textContent).toContain("Paste a message, link, or claim first.");
    expect(screen.getByRole("textbox", { name: /message, link or claim/i })).toBeTruthy();
  });

  it("opens Investigate, lets the user check questions, and updates the date timeline", async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole("button", { name: /normal message/i }));
    await user.click(screen.getByRole("button", { name: /inspect input/i }));
    await user.click(screen.getByRole("button", { name: /investigate check what is missing/i }));

    expect(screen.getByRole("heading", { name: /questions to check yourself/i })).toBeTruthy();
    expect(screen.getByText(/no evidence notes yet/i)).toBeTruthy();
    const authorCheck = screen.getByRole("checkbox", { name: /who first made this claim/i });
    await user.click(authorCheck);
    expect((authorCheck as HTMLInputElement).checked).toBe(true);
    expect(screen.getByText(/no publication date is entered/i)).toBeTruthy();

    fireEvent.change(screen.getByLabelText("Published"), { target: { value: "2024-01-01" } });
    fireEvent.change(screen.getByLabelText("Received"), { target: { value: "2024-05-15" } });
    expect(screen.queryByRole("checkbox", { name: /when was this first published/i })).toBeNull();
    expect(screen.getByText(/old content may be recirculated/i)).toBeTruthy();
    expect(screen.getByText(/arrived long after it was first published/i)).toBeTruthy();
    expect(screen.getByRole("list", { name: /entered dates from earliest to latest/i }).textContent).toContain("Published");
  });

  it("associates every visible form control with a label in Submit and Investigate", async () => {
    const user = userEvent.setup();
    render(<App />);
    const assertEveryFieldHasLabel = () => {
      const fields = Array.from(document.querySelectorAll<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>("input, textarea, select"));
      expect(fields.length).toBeGreaterThan(0);
      expect(fields.every((field) => field.labels && field.labels.length > 0)).toBe(true);
    };
    assertEveryFieldHasLabel();

    await user.click(screen.getByRole("button", { name: /normal message/i }));
    await user.click(screen.getByRole("button", { name: /inspect input/i }));
    await user.click(screen.getByRole("button", { name: /investigate check what is missing/i }));
    assertEveryFieldHasLabel();
  });

  it("warns but accepts invalid note URLs and supports edit, delete, counts, and repost caveats", async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole("button", { name: /normal message/i }));
    await user.click(screen.getByRole("button", { name: /inspect input/i }));
    await user.click(screen.getByRole("button", { name: /investigate check what is missing/i }));

    fireEvent.change(screen.getByRole("textbox", { name: /source url/i }), { target: { value: "not a valid url" } });
    expect(screen.getByText(/this URL could not be parsed.*still save/i)).toBeTruthy();
    fireEvent.change(screen.getByRole("textbox", { name: "Title" }), { target: { value: "First source" } });
    fireEvent.change(screen.getByRole("textbox", { name: "Note" }), { target: { value: "A short note from this source." } });
    await user.click(screen.getByRole("button", { name: "Add note" }));
    expect(screen.getByText("First source")).toBeTruthy();
    expect(screen.getByText(/this address was not opened/i)).toBeTruthy();

    await user.click(screen.getByRole("button", { name: /^Edit$/ }));
    const title = screen.getByRole("textbox", { name: "Title" });
    fireEvent.change(title, { target: { value: "Edited source" } });
    await user.click(screen.getByRole("button", { name: /save changes/i }));
    expect(screen.getByText("Edited source")).toBeTruthy();

    for (const noteTitle of ["Copy one", "Copy two"]) {
      fireEvent.change(screen.getByRole("textbox", { name: "Title" }), { target: { value: noteTitle } });
      fireEvent.change(screen.getByRole("textbox", { name: "Note" }), { target: { value: "A reposted copy." } });
      await user.selectOptions(screen.getByLabelText("This source"), "supports");
      await user.selectOptions(screen.getByLabelText("Source type"), "repost");
      await user.click(screen.getByRole("button", { name: "Add note" }));
    }
    expect(screen.getByText(/repeated copies are not independent confirmation/i)).toBeTruthy();
    expect(screen.getByLabelText("Evidence note summary").textContent).toContain("2 supports");

    await user.click(screen.getByRole("button", { name: "Delete Edited source" }));
    expect(screen.queryByText("Edited source")).toBeNull();
  });

  it("autosaves the active case locally and restores it after remount", async () => {
    const { unmount } = render(<App />);
    fireEvent.change(screen.getByRole("textbox", { name: /message, link or claim/i }), { target: { value: "A note to keep" } });
    await waitFor(() => {
      const stored = JSON.parse(localStorage.getItem("sondera.case.v1") ?? "null");
      expect(stored?.activeCase.input).toBe("A note to keep");
      expect(stored?.schemaVersion).toBe(1);
    });
    expect(screen.getByText(/saved locally at \d\d:\d\d/i)).toBeTruthy();
    unmount();
    render(<App />);
    expect((screen.getByRole("textbox", { name: /message, link or claim/i }) as HTMLTextAreaElement).value).toBe("A note to keep");
  });

  it("confirms delete-all and clears the stored active case", async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole("button", { name: /delete all my data/i }));
    expect(screen.getByRole("alertdialog", { name: /delete all stored data/i })).toBeTruthy();
    await user.click(within(screen.getByRole("alertdialog")).getByRole("button", { name: /delete all my data/i }));
    expect(localStorage.getItem("sondera.case.v1")).toBeNull();
    expect(screen.getByRole("textbox", { name: /message, link or claim/i })).toBeTruthy();
  });

  it("opens the real Decision Receipt as the fourth step", async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole("button", { name: /normal message/i }));
    await user.click(screen.getByRole("button", { name: /inspect input/i }));
    await user.click(screen.getByRole("button", { name: /decide & document review and export the receipt/i }));
    expect(screen.getByRole("heading", { name: "Decision Receipt" })).toBeTruthy();
    expect(screen.getByRole("heading", { name: "Checks actually performed" })).toBeTruthy();
    expect(screen.getByRole("heading", { name: "Checks not performed" })).toBeTruthy();
    expect(screen.getByRole("heading", { name: "Evidence references" })).toBeTruthy();
    expect(screen.getByRole("heading", { name: "Unresolved questions" })).toBeTruthy();
    expect(screen.getByRole("button", { name: /print \/ save as pdf/i })).toBeTruthy();
    expect(screen.getByRole("button", { name: /^Markdown$/i })).toBeTruthy();
    expect(screen.getByRole("button", { name: /^JSON$/i })).toBeTruthy();
    expect(screen.getByText("No indicators found")).toBeTruthy();
  });

  it("announces when a receipt download cannot be prepared", async () => {
    const user = userEvent.setup();
    render(<App />);
    const steps = within(screen.getByRole("navigation", { name: /investigation steps/i })).getAllByRole("button");
    steps[3].focus();
    await user.keyboard("{Enter}");
    const NativeUrl = URL;
    class UnavailableDownloadUrl extends NativeUrl {
      static createObjectURL(): string { throw new Error("Blob downloads unavailable"); }
      static revokeObjectURL(): void {}
    }
    vi.stubGlobal("URL", UnavailableDownloadUrl);
    try {
      await user.click(screen.getByRole("button", { name: /^Markdown$/i }));
      expect(screen.getByRole("status").textContent).toContain("download could not be prepared");
    } finally {
      vi.unstubAllGlobals();
    }
  });
});
