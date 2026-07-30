import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App";
import "./styles/global.css";
import "./styles/chat.css";
import "./styles/chat-patches.css";
import "./styles/chat-animations.css"; // ← subtle animations layer

const rootElement = document.getElementById("root") as HTMLElement;

ReactDOM.createRoot(rootElement).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>,
);

// Crawlable snapshots keep useful HTML in the initial response. Do not paint the
// snapshot while React replaces it with the full interactive library experience.
window.requestAnimationFrame(() => rootElement.removeAttribute('data-seo-loading'));
