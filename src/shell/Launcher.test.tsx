import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { I18nProvider } from "../i18n/i18n";
import { Launcher } from "./Launcher";
import { takePendingAbc } from "../app/router";
import { APPS } from "../app/registry";

function renderLauncher() {
  const navigate = vi.fn();
  render(
    <I18nProvider>
      <Launcher navigate={navigate} />
    </I18nProvider>,
  );
  return { navigate };
}

// A real tune off thesession.org: headers (X:, T:, M:, L:, K:) plus a body.
const KESH_ABC = `X:1
T:The Kesh
M:6/8
L:1/8
K:G
GFG BAB | gfg gab | GFG BAB | AGF GBd |
GFG BAB | gfg gab | age edB | AGF G3 |`;

describe("Launcher", () => {
  beforeEach(() => {
    // Clear the in-memory hand-off channel so one test's ABC never leaks to the next.
    takePendingAbc();
  });

  it("lists every app as a card when the input is empty", () => {
    renderLauncher();
    // One card per catalogued app, no suggestions yet.
    expect(screen.getAllByRole("button")).toHaveLength(APPS.length);
  });

  it("routes a card click to that app", async () => {
    const user = userEvent.setup();
    const { navigate } = renderLauncher();
    await user.click(screen.getAllByRole("button")[0]);
    expect(navigate).toHaveBeenCalledWith("converter");
  });

  it("offers the metronome when a bare tempo is typed", async () => {
    const user = userEvent.setup();
    const { navigate } = renderLauncher();
    await user.type(screen.getByRole("textbox"), "120");
    const suggestions = screen.getAllByRole("button");
    expect(suggestions).toHaveLength(1);
    await user.click(suggestions[0]);
    expect(navigate).toHaveBeenCalledWith("metronome");
  });

  it("offers the converter when pasted text looks like ABC", async () => {
    const user = userEvent.setup();
    const { navigate } = renderLauncher();
    await user.type(screen.getByRole("textbox"), "K:D{Enter}DEF GAB");
    // The ABC suggestion is prepended above the app cards.
    const buttons = screen.getAllByRole("button");
    expect(buttons).toHaveLength(APPS.length + 1);
    await user.click(buttons[0]);
    expect(navigate).toHaveBeenCalledWith("converter");
  });

  it("detects a full multi-line ABC tune and hands it off to the converter", async () => {
    const user = userEvent.setup();
    const { navigate } = renderLauncher();
    const input = screen.getByRole("textbox");
    await user.click(input);
    await user.paste(KESH_ABC);
    // ABC mode: the suggestion leads and the keyword filter is suppressed (all cards stay).
    const buttons = screen.getAllByRole("button");
    expect(buttons).toHaveLength(APPS.length + 1);
    await user.click(buttons[0]);
    expect(navigate).toHaveBeenCalledWith("converter");
    // The pasted tune travels through the hand-off channel verbatim, not the URL.
    expect(takePendingAbc()).toBe(KESH_ABC);
  });

  it("detects ABC from a lone header line (X:1)", async () => {
    const user = userEvent.setup();
    renderLauncher();
    await user.type(screen.getByRole("textbox"), "X:1");
    // Header present → converter suggestion shows alongside the app cards.
    expect(screen.getAllByRole("button")).toHaveLength(APPS.length + 1);
  });

  it("treats a prose sentence as a search, not ABC", async () => {
    const user = userEvent.setup();
    renderLauncher();
    await user.type(screen.getByRole("textbox"), "how do I tune my whistle");
    // No header field → no converter hand-off waiting in the channel.
    expect(takePendingAbc()).toBeNull();
    // And no ABC suggestion is prepended: only filtered cards, never the
    // ABC signature (all app cards + suggestion).
    const buttons = screen.getAllByRole("button");
    expect(buttons.length).toBeLessThanOrEqual(APPS.length);
  });
});
