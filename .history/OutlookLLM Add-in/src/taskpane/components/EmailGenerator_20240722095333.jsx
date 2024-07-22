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
  Tooltip,
  Divider,
  mergeClasses,
  Title3,
  Body1
} from "@fluentui/react-components";
import * as FluentIcons from "@fluentui/react-icons";

const useStyles = makeStyles({
  container: {
    display: "flex",
    flexDirection: "column",
    width: "100%",
    height: "100vh",
    backgroundColor: tokens.colorNeutralBackground1,
    ...shorthands.overflow("hidden"),
  },
  content: {
    display: "flex",
    flexDirection: "column",
    padding: tokens.spacingVerticalM,
    gap: tokens.spacingVerticalM,
    overflowY: "auto",
    flex: 1,
  },
  title: {
    fontSize: tokens.fontSizeBase600,
    fontWeight: tokens.fontWeightSemibold,
    textAlign: "center",
    color: tokens.colorNeutralForeground1,
  },
  buttonsContainer: {
    display: "flex",
    flexDirection: "column",
    gap: tokens.spacingVerticalS,
  },
  button: {
    width: "100%",
  },
  emailContent: {
    flex: 1,
    minHeight: 0,
    overflowY: "auto",
    padding: tokens.spacingVerticalS,
    border: `${tokens.strokeWidthThin} solid ${tokens.colorNeutralStroke1}`,
    borderRadius: tokens.borderRadiusMedium,
    backgroundColor: tokens.colorNeutralBackground2,
  },
  emailText: {
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
  header: {
    marginBottom: tokens.spacingVerticalL,
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
      <div className={mergeClasses(styles.container, styles.spinnerContainer)}>
        <Spinner size="large" label="Loading user data..." />
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.container}>
        <div className={styles.content}>
          <Text className={styles.errorText}>{error}</Text>
        </div>
      </div>
    );
  }

  if (!userConfig || !userConfig.buttons || userConfig.buttons.length === 0) {
    return (
      <div className={styles.container}>
        <div className={styles.content}>
          <Text>No actions available. Please contact support.</Text>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.content}>
        <Title3 className={styles.header}>AI Email Assistant</Title3>
        <div className={styles.buttonsContainer}>
          {userConfig.buttons.map((buttonConfig, index) => {
            const IconComponent = FluentIcons[buttonConfig.icon] || FluentIcons.QuestionCircleRegular;
            return (
              <Tooltip content={`Click to ${buttonConfig.label.toLowerCase()}`} relationship="label" key={index}>
                <Button
                  appearance="primary"
                  className={styles.button}
                  disabled={isProcessing}
                  onClick={() => handleButtonClick(buttonConfig)}
                  icon={<IconComponent />}
                >
                  {buttonConfig.label}
                </Button>
              </Tooltip>
            );
          })}
        </div>
        {isProcessing && (
          <div className={styles.spinnerContainer}>
            <Spinner size="small" label="Processing..." />
          </div>
        )}
        {emailContent && (
          <Card className={styles.emailContent}>
            <CardHeader header={<Body1 weight="semibold">Email Content</Body1>} />
            <Divider />
            <Text className={styles.emailText}>{emailContent}</Text>
          </Card>
        )}
      </div>
    </div>
  );
};

export default EmailGenerator;
