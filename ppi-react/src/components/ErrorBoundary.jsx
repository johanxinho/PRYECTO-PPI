import { Component } from "react";

/**
 * Evita la pantalla en blanco si una vista falla: muestra un aviso y permite
 * recargar sin perder la sesión guardada por Supabase.
 */
export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { failed: false };
  }

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(error, info) {
    console.error("[recordate] vista no renderizada", {
      message: error?.message,
      componentStack: info?.componentStack?.slice(0, 600),
    });
  }

  render() {
    if (!this.state.failed) return this.props.children;
    const english =
      typeof document !== "undefined" && document.documentElement.lang === "en";
    const text = english
      ? {
          title: "Something went wrong.",
          body: "The view could not load. Your data is safe.",
          action: "Reload",
        }
      : {
          title: "Algo salió mal.",
          body: "La vista no pudo cargarse. Tus datos están a salvo.",
          action: "Recargar",
        };
    return (
      <div className="app-crash" role="alert">
        <h1>{text.title}</h1>
        <p>{text.body}</p>
        <button
          className="primary-button"
          type="button"
          onClick={() => window.location.reload()}
        >
          {text.action}
        </button>
      </div>
    );
  }
}