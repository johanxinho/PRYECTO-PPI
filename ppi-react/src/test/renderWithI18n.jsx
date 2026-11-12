import { render } from "@testing-library/react";
import { I18nProvider } from "../i18n";

// Las pruebas montan componentes sueltos; el proveedor aporta t() y el idioma.
export function renderWithI18n(ui, options) {
  // jsdom declara navigator.language = "en-US"; las aserciones están en español.
  window.localStorage.setItem("recordate_language", "es");
  return render(<I18nProvider>{ui}</I18nProvider>, options);
}
