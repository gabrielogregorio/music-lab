import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { I18nProvider } from "../i18n/i18n";
import { Nav } from "./Nav";
import type { RouteName } from "../app/router";

function renderNav(route: RouteName) {
  const navigate = vi.fn();
  render(
    <I18nProvider>
      <Nav route={route} navigate={navigate} />
    </I18nProvider>,
  );
  return { navigate };
}

describe("Nav", () => {
  it("marks exactly the current route with aria-current", () => {
    renderNav("converter");
    expect(screen.getAllByRole("button", { current: "page" })).toHaveLength(1);
  });

  it("marks the home tab as current on the home route", () => {
    renderNav("home");
    const current = screen.getAllByRole("button", { current: "page" });
    expect(current).toHaveLength(1);
    // The home tab leads the list.
    expect(current[0]).toBe(screen.getAllByRole("button")[0]);
  });

  it("navigates home when the first tab is clicked", async () => {
    const user = userEvent.setup();
    const { navigate } = renderNav("converter");
    await user.click(screen.getAllByRole("button")[0]);
    expect(navigate).toHaveBeenCalledWith("home");
  });

  it("navigates to the tab that was clicked", async () => {
    const user = userEvent.setup();
    const { navigate } = renderNav("converter");
    // Order: home, converter, tuner, metronome, practice.
    await user.click(screen.getAllByRole("button")[2]);
    expect(navigate).toHaveBeenCalledWith("tuner");
  });
});
