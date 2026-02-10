import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App";
import "./styles.css";
import { SessionProvider } from "./state/SessionContext";

// REMOVIDO: import { initStorageIfNeeded } from "./lib/storage";
// REMOVIDO: initStorageIfNeeded();

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <SessionProvider>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </SessionProvider>
  </React.StrictMode>
);