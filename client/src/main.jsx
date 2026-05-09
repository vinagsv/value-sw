import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App.jsx";

// Create a dedicated, stable print portal node
const printPortal = document.createElement('div');
printPortal.id = 'print-portal';
document.body.appendChild(printPortal);

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <App />
  </StrictMode>
);