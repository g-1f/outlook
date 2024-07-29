import * as React from "react";
import { createRoot } from "react-dom/client";
import App from "./components/App";
import { FluentProvider, webLightTheme } from "@fluentui/react-components";

/* global document, Office */

const rootElement = document.getElementById("container");
const root = createRoot(rootElement);

/* Render application after Office initializes */
Office.onReady(() => {
  root.render(
    <FluentProvider theme={webLightTheme}>
      <App />
    </FluentProvider>
  );
});

import * as React from "react";
import { createRoot } from "react-dom/client";
import App from "./components/App";
import { FluentProvider, webLightTheme } from "@fluentui/react-components";
import { AdaptiveCards } from "adaptivecards-react";

// Register the Adaptive Cards for React
AdaptiveCards.useHostConfig({
  hostCapabilities: {
    canProvideFallback: false,
  },
  containerStyles: {
    default: {
      backgroundColor: "#FFFFFF",
      foregroundColors: {
        default: {
          default: "#333333",
          subtle: "#666666",
        },
        accent: {
          default: "#106ebe",
          subtle: "#106ebe",
        },
      },
    },
  },
});

const rootElement = document.getElementById("container");
const root = createRoot(rootElement);

Office.onReady(() => {
  root.render(
    <React.StrictMode>
      <FluentProvider theme={webLightTheme}>
        <App />
      </FluentProvider>
    </React.StrictMode>
  );
});