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
  Divider,
  Tooltip
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
    gap: "16px",
    height: "100%",
  },
  titleContainer: {
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: "16px",
  },
  title: {
    fontSize: tokens.fontSizeHero700,
    fontWeight: tokens.fontWeightSemibold,
    color: tokens.colorNeutralForeground1,
    lineHeight: tokens.lineHeightHero700,
  },
  buttonsContainer: {
    display: "flex",
    flexDirection: "row",
    justifyContent: "center",
    flexWrap: "wrap",
    gap: "12px",
  },
  button: {
    minWidth: "120px",
    height: "40px",
    flex: "1 1 auto",
    maxWidth: "200px",
    justifyContent: "center",
    fontSize: tokens.fontSizeBase300,
    fontWeight: tokens.fontWeightSemibold,
  },
  tooltip: {
    maxWidth: "300px",
    textAlign: "center",
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
  const styles = useStyles();
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [userConfig, setUserConfig] = useState(null);
  const [error, setError] = useState(null);
  const [originalContent, setOriginalContent] = useState(null);
  const [generatedContent, setGeneratedContent] = useState(null);

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
    setOriginalContent(null);
    setGeneratedContent(null);
    try {
      const content = await getEmailContent();
      const response = await fetch(buttonConfig.apiEndpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: userConfig.userId, emailContent: content }),
      });
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      const responseData = await response.json();
      setOriginalContent(responseData.originalContent);
      setGeneratedContent(responseData.generatedContent);
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
            <Tooltip
              key={index}
              content={
                <Text className={styles.tooltip}>{buttonConfig.description}</Text>
              }
              relationship="description"
              positioning="below"
            >
              <Button
                appearance="primary"
                className={styles.button}
                disabled={isProcessing}
                onClick={() => handleButtonClick(buttonConfig)}
              >
                {buttonConfig.label}
              </Button>
            </Tooltip>
          ))}
        </div>
        {isProcessing && (
          <div className={styles.spinnerContainer}>
            <Spinner size="small" label="Processing..." />
          </div>
        )}
        {originalContent && (
          <Card className={styles.emailContent}>
            <CardHeader header={<Text weight="semibold">Original Email Content</Text>} />
            <Divider />
            <Text className={styles.emailText}>{originalContent}</Text>
          </Card>
        )}
        {generatedContent && (
          <Card className={styles.emailContent}>
            <CardHeader header={<Text weight="semibold">Generated Email Content</Text>} />
            <Divider />
            <Text className={styles.emailText}>{generatedContent}</Text>
          </Card>
        )}
      </div>
    </div>
  );
};

export default EmailGenerator;
