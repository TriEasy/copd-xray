import { createBrowserRouter } from "react-router";
import { Root } from "./components/Root";
import { Detection } from "./components/Detection";
import { SeverityAssessment } from "./components/SeverityAssessment";
import { AIAssistant } from "./components/AIAssistant";
import { About } from "./components/About";

export const router = createBrowserRouter([
  {
    path: "/",
    Component: Root,
    children: [
      { index: true, Component: Detection },
      { path: "severity", Component: SeverityAssessment },
      { path: "assistant", Component: AIAssistant },
      { path: "about", Component: About },
    ],
  },
]);
