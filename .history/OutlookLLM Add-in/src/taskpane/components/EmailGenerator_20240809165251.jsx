import * as React from "react";
import { useState, useEffect, useCallback } from "react";
import {
  Button,
  Text,
  Spinner,
  makeStyles,
  shorthands,
  tokens,
} from "@fluentui/react-components";
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
  actionBar: {
    // ... (keep existing styles)
  },
  actionContent: {
    // ... (keep existing styles)
  },
  // ... (keep other existing styles)

  statusContainer: {
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    marginTop: "24px",
    minHeight: "60px", // Ensure consistent height
  },
  statusMessage: {
    padding: "12px 24px",
    borderRadius: tokens.borderRadiusMedium,
    backgroundColor: tokens.colorNeutralBackground1,
    color: tokens.colorNeutralForeground1,
    boxShadow: tokens.shadow4,
    textAlign: "center",
    fontSize: tokens.fontSizeBase300,
    fontWeight: tokens.fontWeightSemibold,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    maxWidth: "80%",
  },
  successMessage: {
    backgroundColor: tokens.colorSuccessBackground,
    color: tokens.colorSuccessForeground1,
  },
  errorMessage: {
    backgroundColor: tokens.colorErrorBackground,
    color: tokens.colorErrorForeground1,
  },
});

const EmailGenerator = ({ userId = "user1" }) => {
  const styles = useStyles();
  const [isProcessing, setIsProcessing] = useState(false);
  const [statusMessage, setStatusMessage] = useState("");
  const [error, setError] = useState(null);
  const [inputValue, setInputValue] = useState("");

  // ... (keep other functions like getEmailContent)

  const handleAction = async (inputValue = null) => {
    setIsProcessing(true);
    setError(null);
    setStatusMessage("");
    try {
      const content = await getEmailContent();
      const payload = {
        userId,
        emailContent: content,
        ...(inputValue && { prompt: inputValue }),
      };

      const response = await fetch("http://localhost:8001/generate_response", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      const responseData = await response.json();

      console.log("Received response:", responseData);
      const htmlContent = wrapInHtml(responseData.generatedContent || responseData.body);

      Office.context.mailbox.item.displayReplyAllForm({
        htmlBody: htmlContent,
      });

      setStatusMessage("Response generated successfully!");
      setInputValue("");
    } catch (e) {
      console.error(`Error in handleAction: ${e.message}`);
      setError(`Failed to generate response. Please try again.`);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.actionBar}>
        {/* ... (keep existing action bar content) */}
      </div>
      <div className={styles.statusContainer}>
        {isProcessing && (
          <div className={styles.statusMessage}>
            <Spinner size="tiny" />
            <span style={{ marginLeft: '8px' }}>Processing your request...</span>
          </div>
        )}
        {statusMessage && (
          <div className={`${styles.statusMessage} ${styles.successMessage}`}>
            {statusMessage}
          </div>
        )}
        {error && (
          <div className={`${styles.statusMessage} ${styles.errorMessage}`}>
            {error}
          </div>
        )}
      </div>
    </div>
  );
};

export default EmailGenerator;