import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import {
  GoldenCaseRunnerApp,
  HeavyGoldenCaseRunnerApp
} from "./game/components/GoldenCaseRunnerApp";
import MapEditorApp from "./map-editor/MapEditorApp";
import "./styles.css";

const container = document.getElementById("root");

if (!container) {
  throw new Error("Root container was not found.");
}

const routeMode = new URL(window.location.href).searchParams.get("mode");
const normalizedPath = window.location.pathname.replace(/\/+$/, "") || "/";
const isGoldenRunnerRoute =
  normalizedPath === "/goldens" || routeMode === "goldens";
const isHeavyGoldenRunnerRoute =
  normalizedPath === "/heavy_goldens" || routeMode === "heavy_goldens";
const isMapEditorRoute =
  normalizedPath === "/mapeditor" || routeMode === "mapeditor";
const RootComponent = isHeavyGoldenRunnerRoute
  ? HeavyGoldenCaseRunnerApp
  : isGoldenRunnerRoute
    ? GoldenCaseRunnerApp
    : isMapEditorRoute
      ? MapEditorApp
      : App;

createRoot(container).render(
  <StrictMode>
    <RootComponent />
  </StrictMode>
);
