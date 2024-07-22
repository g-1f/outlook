import * as React from "react";
import { useState, useEffect, useCallback } from "react";
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
  Tooltip,
  Avatar
} from "@fluentui/react-components";
import {
  MailTemplate24Regular,
  Send24Regular,
  DocumentSearch24Regular
} from "@fluentui/react-icons";

const useStyles = makeStyles({
  container: {
    display: "flex",
    flexDirection: "column",
    width: "100%",
    height: "100vh",
    backgroundColor: tokens.colorNeutralBackground3,
    ...shorthands.padding("16px"),
    boxSizing: "border-box",
    overflow: "hidden",
  },
  header: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: "16px",
  },
  logo: {
    marginRight: "8px",
    backgroundColor: tokens.colorBrandBackground,
    color: tokens.colorNeutralBackground1,
  },
  title: {
    fontSize: tokens.fontSizeBase600,
    fontWeight: tokens.fontWeightSemibold,
    color: tokens.colorNeutralForeground1,
  },
  content: {
    display: "flex",
    flexDirection: "column",
    gap: "16px",
    flex: 1,
    backgroundColor: tokens.colorNeutralBackground2,
    borderRadius: tokens.borderRadiusMedium,
    ...shorthands.padding("16px"),
    boxShadow: tokens.shadow4,
    overflow: "hidden",
  },
  buttonsContainer: {
    display: "flex",
    flexDirection: "row",
    justifyContent: "center",
    flexWrap: "wrap",
    gap: "12px",
    marginBottom: "16px",
  },
  button: {
    minWidth: "120px",
    height: "40px",
    ...shorthands.padding("0", "16px"),
    fontSize: tokens.fontSizeBase400,
    fontWeight: tokens.fontWeightSemibold,
  },
  tooltip: {
    maxWidth: "300px",
    textAlign: "center",
    fontSize: tokens.fontSizeBase400,
  },
  emailContentContainer: {
    flex: 1,
    overflowY: "auto",
  },
  emailContent: {
    backgroundColor: tokens.colorNeutralBackground1,
    borderRadius: tokens.borderRadiusMedium,
    boxShadow: tokens.shadow4,
  },
  emailTextContainer: {
    padding: "16px",
  },
  emailText: {
    whiteSpace: "pre-wrap",
    wordBreak: "break-word",
    fontSize: tokens.fontSizeBase400,
  },
  errorText: {
    color: tokens.colorPaletteRedForeground1,
    textAlign: "center",
    padding: "16px",
    fontSize: tokens.fontSizeBase400,
  },
  spinnerContainer: {
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    padding: "16px",
  },
});

const EmailGenerator = () => {
  const styles = useStyles();
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [userConfig, setUserConfig] = useState(null);
  const [error, setError] = useState(null);
  const [generatedContent, setGeneratedContent] = useState(null);

  const fetchUserConfig = useCallback(async () => {
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
  }, []);

  useEffect(() => {
    fetchUserConfig();
  }, [fetchUserConfig]);

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
      setGeneratedContent(responseData.generatedContent);
    } catch (e) {
      console.error(`Error in handleButtonClick: ${e.message}`);
      setError(`Failed to ${buttonConfig.label.toLowerCase()}. Please try again.`);
    } finally {
      setIsProcessing(false);
    }
  };

  const getButtonIcon = (label) => {
    switch (label.toLowerCase()) {
      case "generate email": return <MailTemplate24Regular />;
      case "send email": return <Send24Regular />;
      case "summarize email": return <DocumentSearch24Regular />;
      default: return <MailTemplate24Regular />;
    }
  };

  if (isLoading) {
    return (
      <div className={styles.container}>
        <div className={styles.spinnerContainer}>
          <Spinner size="medium" label="Loading user data..." />
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
        <Text className={styles.errorText}>No actions available. Please contact support.</Text>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <Avatar className={styles.logo} icon={<MailTemplate24Regular />} size={32} />
        <Text className={styles.title}>AI Email Assistant</Text>
      </div>
      <div className={styles.content}>
        <div className={styles.buttonsContainer}>
          {userConfig.buttons.map((buttonConfig, index) => (
            <Tooltip
              key={index}
              content={<Text className={styles.tooltip}>{buttonConfig.description}</Text>}
              relationship="description"
              positioning="below"
            >
              <Button
                appearance="primary"
                className={styles.button}
                disabled={isProcessing}
                onClick={() => handleButtonClick(buttonConfig)}
                icon={getButtonIcon(buttonConfig.label)}
              >
                {buttonConfig.label}
              </Button>
            </Tooltip>
          ))}
        </div>
        {isProcessing && (
          <div className={styles.spinnerContainer}>
            <Spinner size="medium" label="Processing your request..." />
          </div>
        )}
        <div className={styles.emailContentContainer}>
          {generatedContent && (
            <Card className={styles.emailContent}>
              <CardHeader 
                image={<Avatar icon={<MailTemplate24Regular />} size={24} />}
                header={<Text size={500} weight="semibold">Generated Email Content</Text>}
              />
              <Divider />
              <div className={styles.emailTextContainer}>
                <Text className={styles.emailText}>{generatedContent}</Text>
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
};

export default EmailGenerator;
