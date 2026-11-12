// Punto de entrada: monta RECORDATE en #root.
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./recordate.css";
import "./i18n/i18n.css";
import "./v2.css";
import App from "./App.jsx";
import { I18nProvider } from "./i18n";
import AmbientBackground from "./components/AmbientBackground";
import { MotionProvider } from "./motion/kit";

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <I18nProvider>
      <MotionProvider>
        {/* La escena vive aquí y nunca se desmonta: navegar no la reinicia. */}
        <AmbientBackground />
        <App />
      </MotionProvider>
    </I18nProvider>
  </StrictMode>,
);