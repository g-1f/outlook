import * as React from "react";
import { useState, useEffect } from "react";
import { Button, Text, Spinner, makeStyles } from "@fluentui/react-components";
import { SendRegular } from "@fluentui/react-icons";
import insertText from "../office-document";

const useStyles = makeStyles({
  container: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    width: "100%",
    maxWidth: "300px",
    padding: "20px",
    boxSizing: "border-box",
    backgroundColor: "white",
    borderRadius: "8px",
    boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
  },
  title: {
    fontSize: "24px",
    fontWeight: "bold",
    marginBottom: "20px",
    textAlign: "center",
    color: "#333",
  },
  button: {
    minWidth: "200px",
    height: "40px",
    marginTop: "20px",
  },
  buttonText: {
    textAlign: "center",
    width: "100%",
  },
});

const EmailGenerator = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [userId, setUserId] = useState(null);
  const [buttonConfig, setButtonConfig] = useState(null);
  const styles = useStyles();

  useEffect(() => {
    const fetchUserId = async () => {
      try {
        const response = await fetch("https://localhost:8385/getUserId");
        if (!response.ok) {
          throw new Error("Failed to fetch user ID");
        }
        const data = await response.json();
        setUserId(data.userId);
      } catch (error) {
        console.error("Error fetching user ID:", error);
      }
    };

    fetchUserId();
  }, []);

  useEffect(() => {
    if (userId) {
      // Here you can define different button configurations based on the user ID
      // This is just an example, adjust according to your needs
      const config = {
        label: `Generate Email for User ${userId}`,
        apiEndpoint: `https://localhost:8385/generateEmail/${userId}`
      };
      setButtonConfig(config);
    }
  }, [userId]);

  const handleGenerateEmail = async () => {
    if (!buttonConfig) return;

    try {
      setIsLoading(true);
      
      const response = await fetch(buttonConfig.apiEndpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ userId }),
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

  if (!buttonConfig) {
    return <Spinner label="Loading user data..." />;
  }

  return (
    <div className={styles.container}>
      <Text className={styles.title}>AI Email Composer</Text>
      <Button 
        appearance="primary"
        className={styles.button}
        disabled={isLoading}
        onClick={handleGenerateEmail}
        icon={<SendRegular />}
      >
        <span className={styles.buttonText}>
          {isLoading ? <Spinner size="tiny" /> : buttonConfig.label}
        </span>
      </Button>
    </div>
  );
};

export default EmailGenerator;