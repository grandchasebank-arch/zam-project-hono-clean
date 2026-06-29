import { createRoot } from "react-dom/client";
import { initDevAdminSession } from "@/lib/api";
import { App } from "./App";

// Refine persists layout mode under "theme"; force dark on every load.
localStorage.setItem("theme", "dark");

initDevAdminSession();

createRoot(document.getElementById("root")!).render(<App />);
