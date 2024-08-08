import * as React from "react";
import { useState, useEffect, useCallback } from "react";
import {
  Text,
  Spinner,
  makeStyles,
  shorthands,
  tokens,
  Card,
  CardHeader,
  Button,
  Textarea,
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
  content: {
    display: "flex",
    flexDirection: "column",
    gap: "16px",
    flex: 1,
    backgroundColor: tokens.colorNeutralBackground1,
    borderRadius: tokens.borderRadiusLarge,
    ...shorthands.padding("24px"),
    boxShadow: tokens.shadow16,
    overflow: "auto",
  },
  actionBar: {
    display: "flex",
    flexDirection: "column",
    gap: "16px",
    width: "100%",
    cursor: "pointer",
    backgroundColor: tokens.colorNeutralBackground1,
    borderRadius: tokens.borderRadiusMedium,
    transition: "all 0.2s ease",
    ":hover": {
      backgroundColor: tokens.colorNeutralBackground1Hover,
      transform: "translateY(-2px)",
      boxShadow: tokens.shadow8,
    },
  },
  actionContent: {
    display: "flex",
    flexDirection: "column",
    gap: "8px",
    padding: "16px",
  },
  actionTitle: {
    fontSize: tokens.fontSizeBase500,
    fontWeight: tokens.fontWeightSemibold,
    color: tokens.colorNeutralForeground1,
  },
  actionDescription: {
    fontSize: tokens.fontSizeBase200,
    color: tokens.colorNeutralForeground3,
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
    marginRight: "12px",
  },
  inputContainer: {
    display: "flex",
    flexDirection: "column",
    gap: "16px",
    padding: "16px",
    backgroundColor: tokens.colorNeutralBackground2,
    borderRadius: tokens.borderRadiusMedium,
  },
  input: {
    width: "100%",
    minHeight: "100px",
    resize: "vertical",
  },
  buttonContainer: {
    display: "flex",
    justifyContent: "flex-end",
    gap: "8px",
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

  // ... (keep existing useEffect, getEmailDetails, and other functions)

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

      Office.context.mailbox.item.displayReplyAllForm({
        htmlBody: responseData.generatedContent || responseData.body,
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

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <IconComponent style={{marginRight: "16px", color: "#106ebe", fontSize: "32px"}} />
        <Text className={styles.title}>AWM AI Assistant</Text>
      </div>
      <div className={styles.content}>
        {selectedAction ? (
          <div className={styles.inputContainer}>
            <Text className={styles.actionTitle}>{selectedAction.label}</Text>
            <Textarea
              className={styles.input}
              placeholder="Enter your prompt here..."
              value={inputValue}
              onChange={(e, data) => setInputValue(data.value)}
            />
            <div className={styles.buttonContainer}>
              <Button appearance="secondary" onClick={() => setSelectedAction(null)}>Cancel</Button>
              <Button appearance="primary" onClick={() => handleAction(selectedAction, inputValue)}>Send</Button>
            </div>
          </div>
        ) : (
          <>
            {userConfig && userConfig.buttons && userConfig.buttons.map((action, index) => (
              <div 
                key={index} 
                className={styles.actionBar}
                onClick={() => handleButtonClick(action)}
              >
                <div className={styles.actionContent}>
                  <div style={{ display: "flex", alignItems: "center" }}>
                    <div className={styles.iconWrapper}>
                      {FluentIcons[action.icon] ? React.createElement(FluentIcons[action.icon]) : <FluentIcons.MailTemplate24Regular />}
                    </div>
                    <Text className={styles.actionTitle}>{action.label}</Text>
                  </div>
                  <Text className={styles.actionDescription}>{action.description}</Text>
                </div>
              </div>
            ))}
          </>
        )}
        {isProcessing && (
          <div className={styles.spinnerContainer}>
            <Spinner size="medium" label="Processing your request..." />
          </div>
        )}
        {statusMessage && (
          <Text className={styles.statusText}>{statusMessage}</Text>
        )}
      </div>
    </div>
  );
};

export default EmailGenerator;