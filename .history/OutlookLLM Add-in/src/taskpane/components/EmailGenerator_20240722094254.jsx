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
  Divider
} from "@fluentui/react-components";
import * as FluentIcons from "@fluentui/react-icons";

const useStyles = makeStyles({
  container: {
    display: "flex",
    flexDirection: "column",
    alignItems: "stretch",
    width: "100%",
    height: "100vh",
    padding: tokens.spacingVerticalM,
    boxSizing: "border-box",
    backgroundColor: tokens.colorNeutralBackground1,
    ...shorthands.gap(tokens.spacingVerticalM),
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
    ...shorthands.gap(tokens.spacingVerticalS),
  },
  button: {
    width: "100%",
  },
  emailContent: {
    flex: 1,
    overflowY: "auto",
    ...shorthands.padding(tokens.spacingVerticalS),
    ...shorthands.border(tokens.strokeWidthThin, "solid", tokens.colorNeutralStroke1),
    ...shorthands.borderRadius(tokens.borderRadiusMedium),
    backgroundColor: tokens.colorNeutralBackground1,
  },
  emailText: {
    whiteSpace: "pre-wrap",
    wordBreak: "break-word",
  },
  errorText: {
    color: tokens.colorPaletteRedForeground1,
    textAlign: "center",
  },
});

const EmailGenerator = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [userConfig, setUserConfig] = useState(null);
  const [error, setError] = useState(null);
  const [emailContent, setEmailContent] = useState(null);
  const styles = useStyles();

  useEffect(() => {
    const fetchUserConfig = async () => {
      try {
        const response = await fetch("http://localhost:8001/getUserConfig");
        if (!response.ok) throw new Error(`Failed to fetch user configuration: ${response.statusText}`);
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
    setIsLoading(true);
    setError(null);
    setEmailContent(null);
    try {
      const content = await getEmailContent();
      const response = await fetch(buttonConfig.apiEndpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: userConfig.userId, emailContent: content }),
      });
      if (!response.ok) throw new Error(`Failed to ${buttonConfig.label.toLowerCase()}`);
      const responseData = await response.json();
      setEmailContent(responseData.originalContent);
    } catch (error) {
      console.error(`Error in handleButtonClick: ${error.message}`);
      setError(`Failed to ${buttonConfig.label.toLowerCase()}. Please try again.`);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className={styles.container}>
        <Spinner label="Loading..." />
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
      <Text className={styles.title}>AI Email Assistant</Text>
      <div className={styles.buttonsContainer}>
        {userConfig.buttons.map((buttonConfig, index) => {
          const IconComponent = FluentIcons[buttonConfig.icon] || FluentIcons.QuestionCircleRegular;
          return (
            <Tooltip content={`Click to ${buttonConfig.label.toLowerCase()}`} relationship="label">
              <Button
                key={index}
                appearance="primary"
                className={styles.button}
                disabled={isLoading}
                onClick={() => handleButtonClick(buttonConfig)}
                icon={<IconComponent />}
              >
                {buttonConfig.label}
              </Button>
            </Tooltip>
          );
        })}
      </div>
      {isLoading && <Spinner label="Processing..." />}
      {error && <Text className={styles.errorText}>{error}</Text>}
      {emailContent && (
        <Card className={styles.emailContent}>
          <CardHeader header={<Text weight="semibold">Email Content</Text>} />
          <Divider />
          <Text className={styles.emailText}>{emailContent}</Text>
        </Card>
      )}
    </div>
  );
};

export default EmailGenerator;