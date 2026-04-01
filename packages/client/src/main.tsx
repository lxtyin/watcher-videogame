import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import { GoldenCaseRunnerApp } from "./game/components/GoldenCaseRunnerApp";
import "./styles.css";

const container = document.getElementById("root");

if (!container) {
  throw new Error("Root container was not found.");
}

const routeMode = new URL(window.location.href).searchParams.get("mode");
const isGoldenRunnerRoute =
  window.location.pathname.replace(/\/+$/, "") === "/goldens" || routeMode === "goldens";
const RootComponent = isGoldenRunnerRoute ? GoldenCaseRunnerApp : App;

createRoot(container).render(
  <StrictMode>
    <RootComponent />
  </StrictMode>
);
