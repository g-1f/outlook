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
  Input,
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
    backgroundColor: tokens.colorNeutralBackground1,
    borderRadius: tokens.borderRadiusMedium,
    ...shorthands.padding("16px"),
    boxShadow: tokens.shadow4,
    overflow: "auto",
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
    minWidth: "140px",
    height: "40px",
    ...shorthands.padding("0", "16px"),
    fontSize: tokens.fontSizeBase300,
    fontWeight: tokens.fontWeightSemibold,
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
    padding: "16px",
  },
  inputCard: {
    padding: "16px",
  },
  input: {
    marginBottom: "16px",
  },
});

const InputCard = ({ title, onSubmit, onCancel }) => {
  const styles = useStyles();
  const [inputValue, setInputValue] = useState("");

  return (
    <Card className={styles.inputCard}>
      <CardHeader header={<Text weight="semibold">{title}</Text>} />
      <Input
        className={styles.input}
        placeholder="Enter your prompt here..."
        value={inputValue}
        onChange={(e) => setInputValue(e.target.value)}
      />
      <div className={styles.buttonsContainer}>
        <Button appearance="primary" onClick={() => onSubmit(inputValue)}>Send</Button>
        <Button appearance="secondary" onClick={onCancel}>Cancel</Button>
      </div>
    </Card>
  );
};

const EmailGenerator = ({ userId = "user1" }) => {
  const styles = useStyles();
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [userConfig, setUserConfig] = useState(null);
  const [error, setError] = useState(null);
  const [statusMessage, setStatusMessage] = useState("");
  const [currentView, setCurrentView] = useState("main");
  const [selectedAction, setSelectedAction] = useState(null);

  const fetchUserConfig = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch(`http://localhost:8001/getUserConfig/${userId}`);
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      const data = await response.json();
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
      const content = await getEmailContent();
      const payload = {
        userId: userConfig.userId,
        emailContent: content,
        ...(inputValue && { prompt: inputValue }),
      };

      const response = await fetch(action.apiEndpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      const responseData = await response.json();

      const htmlContent = wrapInHtml(responseData.generatedContent);

      Office.context.mailbox.item.displayReplyAllForm({
        htmlBody: htmlContent,
      });

      setStatusMessage(`${action.label} completed successfully!`);
      setCurrentView("main");
    } catch (e) {
      console.error(`Error in handleAction: ${e.message}`);
      setError(`Failed to ${action.label.toLowerCase()}. Please try again.`);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleButtonClick = (action) => {
    if (action.requiresInput) {
      setSelectedAction(action);
      setCurrentView("input");
    } else {
      handleAction(action);
    }
  };

  const getIcon = (iconName) => {
    const IconComponent = FluentIcons[iconName];
    return IconComponent ? IconComponent : FluentIcons.MailTemplate24Regular;
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
        <IconComponent style={{marginRight: "10px", color: tokens.colorBrandForeground1}} />
        <Text className={styles.title}>AI Email Assistant</Text>
      </div>
      <div className={styles.content}>
        {currentView === "main" ? (
          <>
            <div className={styles.buttonsContainer}>
              {userConfig.buttons.map((action, index) => {
                const ButtonIcon = getIcon(action.icon);
                return (
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
                      icon={<ButtonIcon />}
                    >
                      {action.label}
                    </Button>
                  </Tooltip>
                );
              })}
            </div>
            {isProcessing && (
              <div className={styles.spinnerContainer}>
                <Spinner size="medium" label="Processing your request..." />
              </div>
            )}
            {statusMessage && (
              <Text className={styles.statusText}>{statusMessage}</Text>
            )}
          </>
        ) : (
          <InputCard
            title={selectedAction?.label || "Enter Prompt"}
            onSubmit={(inputValue) => handleAction(selectedAction, inputValue)}
            onCancel={() => setCurrentView("main")}
          />
        )}
      </div>
    </div>
  );
};

export default EmailGenerator;