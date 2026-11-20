import React from "react";
import ReactDOM from "react-dom/client";
import { getCurrentWindow } from "@tauri-apps/api/window"
import "@fontsource-variable/inter";
import "./styles.css"
import App from "./App";
import Widget from "./Widget"
import Splash from "./Splash"
import { applyCachedTheme } from "./theme";

const label = getCurrentWindow().label;
document.documentElement.dataset.window = label;
applyCachedTheme();

const Root = label === "widget" ? Widget : label === "splash" ? Splash : App;

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <Root />
  </React.StrictMode>,
);