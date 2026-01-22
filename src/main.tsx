import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { configureBackgroundRemoval } from "./lib/backgroundRemoval";
import { supabase } from "./lib/supabase-stub";

// Make supabase available globally (stub for migration)
(window as any).supabase = supabase;

// Configure rembg microservice for background removal
// Uses local self-hosted service (zero cost, unlimited)
configureBackgroundRemoval({
  provider: 'rembg-local',
  apiUrl: 'http://localhost:5001'
});

// Initialize and verify connection
import { initBackgroundRemover } from "./lib/backgroundRemoval";
initBackgroundRemover().catch(error => {
  console.warn('Could not initialize rembg service:', error);
  // Falls back to cloud API if local service unavailable
});

// Pre-initialize face detector for faster first-time use
import { initFaceDetector } from "./lib/faceDetection";
initFaceDetector().catch(error => {
  console.warn('Could not pre-initialize face detector:', error);
  // Will initialize on-demand when needed
});

createRoot(document.getElementById("root")!).render(<App />);
