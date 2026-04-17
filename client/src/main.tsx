import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import { captureUtmParams } from "./lib/utm";

// Capture UTM params and invite code BEFORE hash routing kicks in
// (params like ?invite=CODE go before the hash: ?invite=CODE#/)
captureUtmParams();

if (!window.location.hash) {
  window.location.hash = "#/";
}

createRoot(document.getElementById("root")!).render(<App />);
