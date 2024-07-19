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
    justifyContent: "center",
    padding: "20px",
    textAlign: "center",
    height: "100%",
  },
  title: {
    fontSize: "24px",
    fontWeight: "bold",
    marginBottom: "16px",
  },
  description: {
    fontSize: "14px",
    marginBottom: "24px",
    maxWidth: "300px",
  },
  button: {
    minWidth: "200px",
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
      <Text className={styles.title}>AI Email Composer</Text>
      <Text className={styles.description}>
        Click the button below to generate a professional email using AI.
      </Text>
      <Button
        appearance="primary"
        className={styles.button}
        disabled={isLoading}
        onClick={handleGenerateEmail}
        icon={<SendRegular />}
      >
        {isLoading ? <Spinner size="tiny" /> : "Generate Email"}
      </Button>
    </div>
  );
};

export default EmailGenerator;