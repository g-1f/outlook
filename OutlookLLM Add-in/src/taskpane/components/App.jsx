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
  content: {
    flex: 1,
    display: "flex",
    justifyContent: "flex-start", // Changed from center to flex-start
    alignItems: "center",
    paddingTop: "20px", // Add some padding at the top
  },
});

const App = () => {
  const styles = useStyles();

  return (
    <div className={styles.root}>
      <main className={styles.content}>
        <EmailGenerator />
      </main>
    </div>
  );
};

export default App;