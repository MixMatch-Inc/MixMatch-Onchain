import { axe } from "jest-axe";
import type { ReactElement } from "react";
import { render } from "@testing-library/react";

/** Renders `ui` and runs axe on it; use with `expect(await checkA11y(ui)).toHaveNoViolations()`. */
export async function checkA11y(ui: ReactElement) {
  const { container } = render(ui);
  return axe(container);
}
