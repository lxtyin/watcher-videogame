import { StrictMode, Suspense, lazy } from "react";
import { createRoot } from "react-dom/client";
import { AudioToggleBar } from "./game/components/AudioToggleBar";
import "./styles.css";

const App = lazy(() => import("./App"));
const GoldenCaseRunnerApp = lazy(async () => ({
  default: (await import("./game/components/GoldenCaseRunnerApp")).GoldenCaseRunnerApp
}));
const HeavyGoldenCaseRunnerApp = lazy(async () => ({
  default: (await import("./game/components/GoldenCaseRunnerApp")).HeavyGoldenCaseRunnerApp
}));
const MapEditorApp = lazy(() => import("./map-editor/MapEditorApp"));

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
    <AudioToggleBar />
    <Suspense fallback={<div className="route-loading-shell">页面加载中...</div>}>
      <RootComponent />
    </Suspense>
  </StrictMode>
);

if (import.meta.env.PROD && "serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker
      .register(`${import.meta.env.BASE_URL}service-worker.js`, {
        scope: import.meta.env.BASE_URL
      })
      .catch((error: unknown) => {
        console.error("Service worker registration failed.", error);
      });
  });
}
