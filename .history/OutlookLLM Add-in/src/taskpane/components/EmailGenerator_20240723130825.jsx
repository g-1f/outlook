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
    fontSize: tokens.fontSizeBase500,
    fontWeight: tokens.fontWeightSemibold,
    color: tokens.colorNeutralForeground2,
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
  summaryInput: {
    marginBottom: "16px",
  },
  summaryCard: {
    padding: "16px",
  },
});

const SummaryInput = ({ onSubmit, onCancel }) => {
  const styles = useStyles();
  const [prompt, setPrompt] = useState("");

  return (
    <Card className={styles.summaryCard}>
      <CardHeader header={<Text weight="semibold">Summarize Email</Text>} />
      <Input
        className={styles.summaryInput}
        placeholder="Enter your summary prompt here..."
        value={prompt}
        onChange={(e) => setPrompt(e.target.value)}
      />
      <div className={styles.buttonsContainer}>
        <Button appearance="primary" onClick={() => onSubmit(prompt)}>Send</Button>
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
  const [showSummaryInput, setShowSummaryInput] = useState(false);

  const fetchUserConfig = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      console.log(`Fetching user configuration for user: ${userId}`);
      const response = await fetch(`http://localhost:8001/getUserConfig/${userId}`, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
        },
      });

      console.log("Response status:", response.status);

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP error! status: ${response.status}, message: ${errorText}`);
      }

      const contentType = response.headers.get("content-type");
      if (!contentType || !contentType.includes("application/json")) {
        throw new Error("Oops! We haven't received a JSON response");
      }

      const data = await response.json();
      console.log("Received user configuration:", data);

      if (!data || !data.buttons) {
        throw new Error("Invalid user configuration received");
      }

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
    // Escape HTML special characters to prevent XSS
    const escapeHtml = (unsafe) => {
      return unsafe
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
    };

    const escapedContent = escapeHtml(content);

    // Replace newlines with <br> tags to preserve line breaks
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

  const handleButtonClick = async (buttonConfig) => {
    if (buttonConfig.label.toLowerCase().includes("summarize")) {
      setShowSummaryInput(true);
      return;
    }

    setIsProcessing(true);
    setError(null);
    setStatusMessage("");
    try {
      const content = await getEmailContent();
      const response = await fetch(buttonConfig.apiEndpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: userConfig.userId, emailContent: content }),
      });
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      const responseData = await response.json();

      const htmlContent = wrapInHtml(responseData.generatedContent);

      Office.context.mailbox.item.displayReplyAllForm({
        htmlBody: htmlContent,
      });

      setStatusMessage(`${buttonConfig.label} completed successfully!`);
    } catch (e) {
      console.error(`Error in handleButtonClick: ${e.message}`);
      setError(`Failed to ${buttonConfig.label.toLowerCase()}. Please try again.`);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSummarySubmit = async (prompt) => {
    setIsProcessing(true);
    setError(null);
    setStatusMessage("");
    try {
      const content = await getEmailContent();
      const response = await fetch("http://localhost:8001/summarize_email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, emailContent: content, prompt }),
      });
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      const responseData = await response.json();

      const htmlContent = wrapInHtml(responseData.generatedContent);

      Office.context.mailbox.item.displayReplyAllForm({
        htmlBody: htmlContent,
      });

      setStatusMessage("Summary created successfully!");
    } catch (e) {
      console.error(`Error in handleSummarySubmit: ${e.message}`);
      setError("Failed to summarize email. Please try again.");
    } finally {
      setIsProcessing(false);
      setShowSummaryInput(false);
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
        <IconComponent style={{marginRight: "10px", color: tokens.colorPaletteBlueBorderActive}} />
        <Text className={styles.title}> AI Email Assistant </Text>
      </div>
      <div className={styles.content}>
        <div className={styles.buttonsContainer}>
          {userConfig.buttons.map((buttonConfig, index) => {
            const ButtonIcon = getIcon(buttonConfig.icon);
            return (
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
                  icon={<ButtonIcon />}
                >
                  {buttonConfig.label}
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
      </div>
    </div>
  );
};

export default EmailGenerator;