import * as React from "react";
import EmailGenerator from "./EmailGenerator";
import { makeStyles } from "@fluentui/react-components";

const useStyles = makeStyles({
  root: {
    height: "100vh",
    display: "flex",
    flexDirection: "column",
    backgroundColor: "#f3f2f1",
    // Add this to hide the Outlook-provided header
    "& > div:first-child": {
      display: "none !important",
    },
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
});

const App = () => {
  const styles = useStyles();

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