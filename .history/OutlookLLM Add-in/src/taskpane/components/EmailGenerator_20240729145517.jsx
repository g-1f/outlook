import * as React from "react";
import { useState, useEffect, useCallback } from "react";
import {
  Button,
  Text,
  Spinner,
  makeStyles,
  shorthands,
  tokens,
  Tooltip,
  Textarea,
  Card,
  CardHeader,
} from "@fluentui/react-components";
import IconComponent from "./IconComponent";
import * as FluentIcons from "@fluentui/react-icons";

const useStyles = makeStyles({
  container: {
    display: "flex",
    flexDirection: "column",
    width: "100%",
    height: "100vh",
    backgroundColor: tokens.colorNeutralBackground3,
    ...shorthands.padding("24px"),
    boxSizing: "border-box",
    overflow: "hidden",
  },
  header: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: "24px",
  },
  title: {
    fontSize: tokens.fontSizeBase700,
    fontWeight: tokens.fontWeightSemibold,
    color: "#106ebe",
  },
  selectedActionLabel: {
    fontSize: tokens.fontSizeBase500,
    fontWeight: tokens.fontWeightSemibold,
    color: "#106ebe",
  },
  actionIcon: {
    fontSize: tokens.fontSizeBase500,
    color: "#106ebe",
  },
  content: {
    display: "flex",
    flexDirection: "column",
    gap: "24px",
    flex: 1,
    backgroundColor: tokens.colorNeutralBackground1,
    borderRadius: tokens.borderRadiusLarge,
    ...shorthands.padding("24px"),
    boxShadow: tokens.shadow16,
    overflow: "auto",
  },
  buttonsContainer: {
    display: "flex",
    flexDirection: "row",
    justifyContent: "center",
    flexWrap: "wrap",
    gap: "16px",
    marginBottom: "24px",
  },
  button: {
    minWidth: "120px",
    height: "44px",
    ...shorthands.padding("0", "12px"),
    fontSize: tokens.fontSizeBase300,
    fontWeight: tokens.fontWeightSemibold,
    borderRadius: tokens.borderRadiusMedium,
    transition: "all 0.2s ease",
    ":hover": {
      transform: "translateY(-2px)",
      boxShadow: tokens.shadow8,
    },
  },
  tooltip: {
    maxWidth: "300px",
    textAlign: "center",
    fontSize: tokens.fontSizeBase200,
  },
  statusText: {
    textAlign: "center",
    marginTop: "16px",
    fontSize: tokens.fontSizeBase300,
    color: tokens.colorNeutralForeground1,
  },
  errorText: {
    color: tokens.colorPaletteRedForeground1,
    textAlign: "center",
    padding: "16px",
    fontSize: tokens.fontSizeBase300,
  },
  spinnerContainer: {
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    padding: "24px",
  },
  inputContainer: {
    display: "flex",
    flexDirection: "column",
    gap: "16px",
    padding: "24px",
    backgroundColor: tokens.colorNeutralBackground2,
    borderRadius: tokens.borderRadiusMedium,
  },
  input: {
    width: "100%",
    minHeight: "150px",
    resize: "vertical",
    ...shorthands.margin("8px", "0"),
    borderRadius: tokens.borderRadiusMedium,
    border: `1px solid ${tokens.colorNeutralStroke1}`,
    ":focus": {
      borderColor: "#106ebe",
      outlineColor: "#106ebe",
    },
  },
  labelContainer: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    marginBottom: "8px",
  },
  iconWrapper: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    width: "32px",
    height: "32px",
    borderRadius: "50%",
    backgroundColor: "#106ebe",
    color: tokens.colorNeutralBackground1,
  },
});

const EmailGenerator = ({ userId = "user1" }) => {
  const styles = useStyles();
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [userConfig, setUserConfig] = useState(null);
  const [error, setError] = useState(null);
  const [statusMessage, setStatusMessage] = useState("");
  const [selectedAction, setSelectedAction] = useState(null);
  const [inputValue, setInputValue] = useState("");

  const fetchUserConfig = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      console.log(`Fetching user configuration for user: ${userId}`);
      const response = await fetch(`http://localhost:8001/getUserConfig/${userId}`);
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      const data = await response.json();
      console.log("Received user configuration:", data);
      setUserConfig(data);
    } catch (e) {
      console.error("Error fetching user configuration:", e);
      setError(`Failed to load user configuration: ${e.message}`);
    } finally {
      setIsLoading(false);
    }
  }, [userId]);

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

  const wrapInHtml = (content) => {
    const escapeHtml = (unsafe) => {
      return unsafe
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
    };

    const escapedContent = escapeHtml(content);
    const formattedContent = escapedContent.replace(/\n/g, "<br>");

    return `
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .email-content { white-space: pre-wrap; font-family: inherit; }
          </style>
        </head>
        <body>
          <div class="email-content">${formattedContent}</div>
        </body>
      </html>
    `;
  };

  const handleAction = async (action, inputValue = null) => {
    setIsProcessing(true);
    setError(null);
    setStatusMessage("");
    try {
      console.log(`Handling action: ${action.label}, Input value: ${inputValue}`);
      const content = await getEmailContent();
      const payload = {
        userId: userConfig.userId,
        emailContent: content,
        ...(inputValue && { prompt: inputValue }),
      };

      console.log(`Sending request to: ${action.apiEndpoint}`);
      const response = await fetch(action.apiEndpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      const responseData = await response.json();

      console.log("Received response:", responseData);
      const htmlContent = wrapInHtml(responseData.generatedContent);

      Office.context.mailbox.item.displayReplyAllForm({
        htmlBody: htmlContent,
      });

      setStatusMessage(`${action.label} completed successfully!`);
      setSelectedAction(null);
      setInputValue("");
    } catch (e) {
      console.error(`Error in handleAction: ${e.message}`);
      setError(`Failed to ${action.label.toLowerCase()}. Please try again.`);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleButtonClick = (action) => {
    console.log(`Button clicked: ${action.label}, Requires input: ${action.requiresInput}`);
    if (action.requiresInput) {
      console.log("Setting selected action for input");
      setSelectedAction(action);
    } else {
      console.log("Handling action directly");
      handleAction(action);
    }
  };

  const getIcon = (iconName) => {
    const IconComponent = FluentIcons[iconName];
    return IconComponent ? (
      <div className={styles.iconWrapper}>
        <IconComponent />
      </div>
    ) : (
      <div className={styles.iconWrapper}>
        <FluentIcons.MailTemplate24Regular />
      </div>
    );
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
        <Card>
          <CardHeader
            image={
              <div className={styles.iconWrapper}>
                <FluentIcons.ErrorCircle24Regular />
              </div>
            }
            header={<Text weight="semibold">Error</Text>}
            description={<Text className={styles.errorText}>{error}</Text>}
          />
        </Card>
      </div>
    );
  }

  if (!userConfig || !userConfig.buttons || userConfig.buttons.length === 0) {
    return (
      <div className={styles.container}>
        <Card>
          <CardHeader
            image={
              <div className={styles.iconWrapper}>
                <FluentIcons.Warning24Regular />
              </div>
            }
            header={<Text weight="semibold">No Actions Available</Text>}
            description={<Text className={styles.errorText}>Please contact support.</Text>}
          />
        </Card>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <IconComponent style={{marginRight: "16px", color: "#106ebe", fontSize: "32px"}} />
        <Text className={styles.title}>AI Email Assistant</Text>
      </div>
      <Card className={styles.content}>
        {selectedAction ? (
          <div className={styles.inputContainer}>
            <div className={styles.labelContainer}>
              {getIcon(selectedAction.icon)}
              <Text className={styles.selectedActionLabel}>{selectedAction.label}</Text>
            </div>
            <Textarea
              className={styles.input}
              placeholder="Enter your prompt here..."
              value={inputValue}
              onChange={(e, data) => setInputValue(data.value)}
            />
            <div className={styles.buttonsContainer}>
              <Button appearance="primary" onClick={() => handleAction(selectedAction, inputValue)}>Send</Button>
              <Button appearance="subtle" onClick={() => setSelectedAction(null)}>Cancel</Button>
            </div>
          </div>
        ) : (
          <div className={styles.buttonsContainer}>
            {userConfig.buttons.map((action, index) => (
              <Tooltip
                key={index}
                content={<Text className={styles.tooltip}>{action.description}</Text>}
                relationship="description"
                positioning="below"
              >
                <Button
                  appearance="primary"
                  className={styles.button}
                  disabled={isProcessing}
                  onClick={() => handleButtonClick(action)}
                  icon={getIcon(action.icon)}
                >
                  {action.label}
                </Button>
              </Tooltip>
            ))}
          </div>
        )}
        {isProcessing && (
          <div className={styles.spinnerContainer}>
            <Spinner size="medium" label="Processing your request..." />
          </div>
        )}
        {statusMessage && (
          <Text className={styles.statusText}>{statusMessage}</Text>
        )}
      </Card>
    </div>
  );
};

export default EmailGenerator;