import * as React from "react";
import EmailGenerator from "./EmailGenerator";
import { makeStyles, shorthands } from "@fluentui/react-components";

const useStyles = makeStyles({
  root: {
    height: "100vh",
    display: "flex",
    flexDirection: "column",
    backgroundColor: "#f3f2f1",
    ...shorthands.overflow("hidden"),
  },
  header: {
    backgroundColor: "#0078d4",
    color: "#ffffff",
    padding: "12px 20px",
    fontSize: "18px",
    fontWeight: "bold",
    boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
  },
  content: {
    flex: 1,
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
  },
  "@global": {
    // Hide Outlook's header
    '[role="heading"]': {
      display: "none !important",
    },
    // Hide any potential command bar
    '.ms-CommandBar': {
      display: "none !important",
    },
    // Adjust padding of the main content area
    '#content-main': {
      ...shorthands.padding("0", "!important"),
    },
    // Hide any other Outlook-provided headers
    'div[class^="ms-"], div[class*=" ms-"]': {
      '&:not(#container)': {
        display: "none !important",
      }
    },
    // Ensure our container takes full height
    '#container': {
      height: "100vh !important",
      ...shorthands.overflow("hidden"),
    },
  },
});

const App = () => {
  const styles = useStyles();

  React.useEffect(() => {
    // This will run after the component mounts
    const style = document.createElement('style');
    style.textContent = `
      body > div:first-child { display: none !important; }
      #content-main { padding: 0 !important; }
    `;
    document.head.appendChild(style);
    return () => document.head.removeChild(style);
  }, []);

  return (
    <div className={styles.root}>
      <header className={styles.header}>
        OutlookLLM
      </header>
      <main className={styles.content}>
        <EmailGenerator />
      </main>
    </div>
  );
};

export default App;