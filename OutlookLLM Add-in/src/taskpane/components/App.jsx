import * as React from "react";
import EmailGenerator from "./EmailGenerator";
import { makeStyles } from "@fluentui/react-components";

const useStyles = makeStyles({
  root: {
    height: "100vh",
    display: "flex",
    flexDirection: "column",
    backgroundColor: "#f3f2f1",
  },
  header: {
    backgroundColor: "#0078d4",
    color: "#ffffff",
    padding: "12px 20px",
    fontSize: "18px",
    fontWeight: "bold",
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