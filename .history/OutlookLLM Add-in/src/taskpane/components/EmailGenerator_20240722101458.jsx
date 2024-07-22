import * as React from "react";
import { useState, useEffect } from "react";
import { 
  Button, 
  Text, 
  Spinner, 
  makeStyles,
  shorthands,
  tokens,
  Card,
  CardHeader,
  Divider
} from "@fluentui/react-components";

const useStyles = makeStyles({
  container: {
    display: "flex",
    flexDirection: "column",
    width: "100%",
    height: "100vh",
    backgroundColor: tokens.colorNeutralBackground3,
    ...shorthands.padding("20px"),
    boxSizing: "border-box",
  },
  content: {
    display: "flex",
    flexDirection: "column",
    gap: "24px",
    height: "100%",
  },
  titleContainer: {
    marginBottom: "16px",
  },
  title: {
    fontSize: tokens.fontSizeBase700,
    fontWeight: tokens.fontWeightSemibold,
    textAlign: "center",
    color: tokens.colorNeutralForeground1,
  },
  buttonsContainer: {
    display: "flex",
    flexDirection: "column",
    gap: "12px",
  },
  button: {
    width: "100%",
    height: "40px",
    justifyContent: "center",
    fontSize: tokens.fontSizeBase400,
    fontWeight: tokens.fontWeightSemibold,
  },
  emailContent: {
    flex: 1,
    overflowY: "auto",
    backgroundColor: tokens.colorNeutralBackground1,
    ...shorthands.borderRadius("4px"),
    boxShadow: tokens.shadow4,
  },
  emailText: {
    padding: "16px",
    whiteSpace: "pre-wrap",
    wordBreak: "break-word",
  },
  errorText: {
    color: tokens.colorPaletteRedForeground1,
    textAlign: "center",
  },
  spinnerContainer: {
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    height: "100%",
  },
});

const EmailGenerator = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [userConfig, setUserConfig] = useState(null);
  const [error, setError] = useState(null);
  const [emailContent, setEmailContent] = useState(null);
  const styles = useStyles();

  useEffect(() => {
    const fetchUserConfig = async () => {
      try {
        const response = await fetch("http://localhost:8001/getUserConfig");
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        const data = await response.json();
        setUserConfig(data);
      } catch (e) {
        console.error("Error fetching user configuration:", e);
        setError("Failed to load user configuration. Please try again later.");
      } finally {
        setIsLoading(false);
      }
    };

    fetchUserConfig();
  }, []);

  const getEmailContent = async () => {
    return new Promise((resolve, reject) => {
      Office.context.mailbox.item.body.getAsync(Office.CoercionType.Text, (result) => {
        if (result.status === Office.AsyncResultStatus.Succeeded) {
          resolve(result.value);
        } else {
          reject(new Error(result.error.message));
        }
      });
    });
  };

  const handleButtonClick = async (buttonConfig) => {
    setIsProcessing(true);
    setError(null);
    setEmailContent(null);
    try {
      const content = await getEmailContent();
      const response = await fetch(buttonConfig.apiEndpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: userConfig.userId, emailContent: content }),
      });
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      const responseData = await response.json();
      setEmailContent(responseData.originalContent);
    } catch (e) {
      console.error(`Error in handleButtonClick: ${e.message}`);
      setError(`Failed to ${buttonConfig.label.toLowerCase()}. Please try again.`);
    } finally {
      setIsProcessing(false);
    }
  };

  if (isLoading) {
    return (
      <div className={styles.container}>
        <div className={styles.spinnerContainer}>
          <Spinner size="large" label="Loading user data..." />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.container}>
        <Text className={styles.errorText}>{error}</Text>
      </div>
    );
  }

  if (!userConfig || !userConfig.buttons || userConfig.buttons.length === 0) {
    return (
      <div className={styles.container}>
        <Text>No actions available. Please contact support.</Text>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.content}>
        <div className={styles.titleContainer}>
          <Text className={styles.title}>AI Email Assistant</Text>
        </div>
        <div className={styles.buttonsContainer}>
          {userConfig.buttons.map((buttonConfig, index) => (
            <Button
              key={index}
              appearance="primary"
              className={styles.button}
              disabled={isProcessing}
              onClick={() => handleButtonClick(buttonConfig)}
            >
              {buttonConfig.label}
            </Button>
          ))}
        </div>
        {isProcessing && (
          <div className={styles.spinnerContainer}>
            <Spinner size="small" label="Processing..." />
          </div>
        )}
        {emailContent && (
          <Card className={styles.emailContent}>
            <CardHeader header={<Text weight="semibold">Email Content</Text>} />
            <Divider />
            <Text className={styles.emailText}>{emailContent}</Text>
          </Card>
        )}
      </div>
    </div>
  );
};

export default EmailGenerator;