// Punto de entrada: monta RECORDATE en #root.
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./recordate.css";
import "./i18n/i18n.css";
import "./v2.css";
import App from "./App.jsx";
import { I18nProvider } from "./i18n";
import AmbientBackground from "./components/AmbientBackground";

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <I18nProvider>
      {/* La escena vive aquí y nunca se desmonta: navegar no la reinicia. */}
      <AmbientBackground />
      <App />
    </I18nProvider>
  </StrictMode>,
);