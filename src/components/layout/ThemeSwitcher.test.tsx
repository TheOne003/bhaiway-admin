import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { ThemeProvider } from "@/providers/ThemeProvider";
import { ThemeSwitcher } from "@/components/layout/ThemeSwitcher";
import userEvent from "@testing-library/user-event";

describe("ThemeSwitcher", () => {
  it("renders light, dark, and system options and switches theme", async () => {
    const user = userEvent.setup();
    render(
      <ThemeProvider>
        <ThemeSwitcher />
      </ThemeProvider>,
    );

    expect(await screen.findByTestId("theme-switcher")).toBeInTheDocument();
    await user.click(screen.getByTestId("theme-dark"));
    expect(screen.getByTestId("theme-dark")).toHaveAttribute("aria-pressed", "true");
    await user.click(screen.getByTestId("theme-light"));
    expect(screen.getByTestId("theme-light")).toHaveAttribute("aria-pressed", "true");
  });
});
