import * as React from "react";
import { useState, useEffect } from "react";
import { Button, Text, Spinner, makeStyles } from "@fluentui/react-components";
import * as FluentIcons from "@fluentui/react-icons";
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
    marginTop: "10px",
  },
  buttonText: {
    textAlign: "center",
    width: "100%",
  },
});

const EmailGenerator = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [userConfig, setUserConfig] = useState(null);
  const [error, setError] = useState(null);
  const styles = useStyles();

  useEffect(() => {
    const fetchUserConfig = async () => {
      try {
        const response = await fetch("https://localhost:8385/getUserConfig");
        if (!response.ok) {
          throw new Error("Failed to fetch user configuration");
        }
        const data = await response.json();
        setUserConfig(data);
      } catch (error) {
        console.error("Error fetching user configuration:", error);
        setError("Failed to load user configuration. Please try again later.");
      } finally {
        setIsLoading(false);
      }
    };

    fetchUserConfig();
  }, []);

  const handleButtonClick = async (buttonConfig) => {
    setIsLoading(true);
    try {
      const response = await fetch(buttonConfig.apiEndpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ userId: userConfig.userId }),
      });

      if (!response.ok) {
        throw new Error(`Failed to ${buttonConfig.label.toLowerCase()}`);
      }

      const textContent = await response.json();
      await insertText(textContent, true);
    } catch (error) {
      console.error(`Error: ${error.message}`);
      setError(`Failed to ${buttonConfig.label.toLowerCase()}. Please try again.`);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return <Spinner label="Loading user data..." />;
  }

  if (error) {
    return <Text>{error}</Text>;
  }

  if (!userConfig || !userConfig.buttons || userConfig.buttons.length === 0) {
    return <Text>No actions available. Please contact support.</Text>;
  }

  return (
    <div className={styles.container}>
      <Text className={styles.title}>AI Email Assistant</Text>
      {userConfig.buttons.map((buttonConfig, index) => {
        const IconComponent = FluentIcons[buttonConfig.icon] || FluentIcons.QuestionCircleRegular;
        return (
          <Button
            key={index}
            appearance="primary"
            className={styles.button}
            disabled={isLoading}
            onClick={() => handleButtonClick(buttonConfig)}
            icon={<IconComponent />}
          >
            <span className={styles.buttonText}>
              {buttonConfig.label}
            </span>
          </Button>
        );
      })}
    </div>
  );
};

export default EmailGenerator;