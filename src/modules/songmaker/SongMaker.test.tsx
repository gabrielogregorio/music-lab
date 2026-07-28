import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { I18nProvider } from "../../i18n/i18n";

// The audio engine touches AudioContext, which jsdom lacks. Stub it so the test
// exercises the grid/controls behaviour, not the sound.
vi.mock("./audio/engine", () => ({
  SongEngine: class {
    async start() {}
    stop() {}
    dispose() {}
    async previewMelody() {}
    async previewPercussion() {}
  },
}));

import { SongMaker } from "./SongMaker";

function renderSongMaker() {
  render(
    <I18nProvider>
      <SongMaker />
    </I18nProvider>,
  );
}

describe("SongMaker", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("toggles a melody cell on when clicked", async () => {
    const user = userEvent.setup();
    renderSongMaker();
    // Default config starts on MIDI 60; the lowest row, first step, is "60 0".
    const cell = screen.getByRole("button", { name: "60 0" });
    expect(cell).toHaveAttribute("aria-pressed", "false");
    await user.click(cell);
    expect(cell).toHaveAttribute("aria-pressed", "true");
  });

  it("undoes the last edit, and is disabled with empty history", async () => {
    const user = userEvent.setup();
    renderSongMaker();
    const undo = screen.getByRole("button", { name: /Undo/ });
    expect(undo).toBeDisabled();

    const cell = screen.getByRole("button", { name: "60 0" });
    await user.click(cell);
    expect(undo).toBeEnabled();
    await user.click(undo);
    expect(cell).toHaveAttribute("aria-pressed", "false");
  });

  it("clears the grid on restart", async () => {
    const user = userEvent.setup();
    renderSongMaker();
    const cell = screen.getByRole("button", { name: "60 0" });
    await user.click(cell);
    expect(cell).toHaveAttribute("aria-pressed", "true");
    await user.click(screen.getByRole("button", { name: /Restart/ }));
    expect(cell).toHaveAttribute("aria-pressed", "false");
  });

  it("opens the settings dialog", async () => {
    const user = userEvent.setup();
    renderSongMaker();
    expect(screen.queryByRole("dialog")).toBeNull();
    await user.click(screen.getByRole("button", { name: /Settings/ }));
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    // The length control lives in the modal.
    expect(screen.getByText("Length")).toBeInTheDocument();
  });
});
