import { describe, it, expect, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { I18nProvider } from "../i18n/i18n";
import { TopBar } from "./TopBar";

beforeEach(() => {
  localStorage.clear();
});

describe("TopBar", () => {
  it("keeps a single language pressed at a time", () => {
    render(
      <I18nProvider>
        <TopBar />
      </I18nProvider>,
    );
    expect(screen.getAllByRole("button", { pressed: true })).toHaveLength(1);
  });

  it("shows a text code per language so the selector is legible without flag emoji", () => {
    // As flags emoji (Escócia/País de Gales, regionais) somem em muito Android/
    // Windows; o código em texto garante que o seletor apareça no mobile.
    render(
      <I18nProvider>
        <TopBar />
      </I18nProvider>,
    );
    expect(screen.getByText("PT")).toBeInTheDocument();
    expect(screen.getByText("EN")).toBeInTheDocument();
    expect(screen.getByText("GD")).toBeInTheDocument();
  });

  it("switches the active language on click and persists the choice", async () => {
    const user = userEvent.setup();
    render(
      <I18nProvider>
        <TopBar />
      </I18nProvider>,
    );
    const other = screen.getAllByRole("button", { pressed: false })[0];
    await user.click(other);
    expect(other).toHaveAttribute("aria-pressed", "true");
    expect(localStorage.getItem("music-lab:lang")).toHaveLength(2);
  });
});
