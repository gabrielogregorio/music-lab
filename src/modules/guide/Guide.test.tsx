import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { I18nProvider } from "../../i18n/i18n";
import { Guide } from "./Guide";

function renderGuide() {
  render(
    <I18nProvider>
      <Guide />
    </I18nProvider>,
  );
}

describe("Guide", () => {
  it("shows the tonic diagram for the default instrument (D whistle)", () => {
    renderGuide();
    // The whistle chart opens on its low D, drawn as a labelled diagram.
    expect(screen.getByRole("img", { name: "D5" })).toBeInTheDocument();
    // A note the whistle has but the recorder does not.
    expect(screen.getByRole("img", { name: "F#5" })).toBeInTheDocument();
  });

  it("swaps the whole chart when another instrument is picked", async () => {
    const user = userEvent.setup();
    renderGuide();
    // Picker order follows the catalog: whistle, fife, recorder.
    await user.click(screen.getAllByRole("button")[2]);
    // Recorder reaches down to C5 (the whistle never does) and drops F#5.
    expect(screen.getByRole("img", { name: "C5" })).toBeInTheDocument();
    expect(screen.queryByRole("img", { name: "F#5" })).toBeNull();
  });

  it("marks exactly the chosen instrument as pressed", async () => {
    const user = userEvent.setup();
    renderGuide();
    const buttons = screen.getAllByRole("button");
    await user.click(buttons[2]);
    expect(buttons[2]).toHaveAttribute("aria-pressed", "true");
    expect(buttons[0]).toHaveAttribute("aria-pressed", "false");
  });

  it("transposes the whistle chart to the chosen key", async () => {
    const user = userEvent.setup();
    renderGuide();
    // Default is D; picking C brings the chart down to low C5.
    await user.click(screen.getByRole("button", { name: "C" }));
    expect(screen.getByRole("img", { name: "C5" })).toBeInTheDocument();
  });

  it("reveals the accidentals in chromatic mode", async () => {
    const user = userEvent.setup();
    renderGuide();
    // The diatonic D chart has no D#5; chromatic mode adds it.
    expect(screen.queryByRole("img", { name: "D#5" })).toBeNull();
    await user.click(screen.getByRole("button", { name: "Chromatic" }));
    expect(screen.getByRole("img", { name: "D#5" })).toBeInTheDocument();
  });
});
