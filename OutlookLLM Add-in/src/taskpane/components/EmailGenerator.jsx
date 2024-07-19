import * as React from "react";
import { useState } from "react";
import { Button, Text, Spinner, makeStyles } from "@fluentui/react-components";
import { SendRegular } from "@fluentui/react-icons";
import insertText from "../office-document";

const useStyles = makeStyles({
  container: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    width: "100%",
    padding: "20px",
  },
  title: {
    fontSize: "24px",
    fontWeight: "bold",
    marginBottom: "20px",
  },
  button: {
    minWidth: "200px",
    height: "40px",
    marginTop: "20px", // Add some space above the button
  },
  buttonText: {
    textAlign: "center",
    width: "100%", // Ensure the text takes up the full width of the button
  },
});

const EmailGenerator = () => {
  const [isLoading, setIsLoading] = useState(false);
  const styles = useStyles();

  const handleGenerateEmail = async () => {
    try {
      setIsLoading(true);
      
      const response = await fetch("https://localhost:8385/generateEmail", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        throw new Error("Failed to generate email");
      }

      const textContent = await response.json();
      await insertText(textContent, true);
    } catch (error) {
      console.error('Error generating email:', error);
      // You could add user-facing error handling here
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={styles.container}>
      <Text className={styles.title}>Compose with AI</Text>
      <Button
        appearance="primary"
        className={styles.button}
        disabled={isLoading}
        onClick={handleGenerateEmail}
        icon={<SendRegular />}
      >
        <span className={styles.buttonText}>
          {isLoading ? <Spinner size="tiny" /> : "Generate Email"}
        </span>
      </Button>
    </div>
  );
};

export default EmailGenerator;