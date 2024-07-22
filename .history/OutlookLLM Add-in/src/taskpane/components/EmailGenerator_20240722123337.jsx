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
  MailTemplate20Regular,
  Send20Regular,
  DocumentSearch20Regular
} from "@fluentui/react-icons";

const useStyles = makeStyles({
  container: {
    display: "flex",
    flexDirection: "column",
    width: "100%",
    height: "100vh",
    backgroundColor: tokens.colorNeutralBackground2,
    ...shorthands.padding("8px"),
    boxSizing: "border-box",
    overflow: "hidden",
  },
  header: {
    display: "flex",
    alignItems: "center",
    marginBottom: "12px",
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
    gap: "8px",
    flex: 1,
    backgroundColor: tokens.colorNeutralBackground1,
    borderRadius: tokens.borderRadiusMedium,
    ...shorthands.padding("8px"),
    boxShadow: tokens.shadow4,
    overflow: "hidden",
  },
  buttonsContainer: {
    display: "flex",
    flexDirection: "row",
    justifyContent: "flex-start",
    flexWrap: "wrap",
    gap: "8px",
    marginBottom: "8px",
  },
  button: {
    minWidth: "auto",
    height: "32px",
    ...shorthands.padding("0", "8px"),
    fontSize: tokens.fontSizeBase200,
  },
  buttonContent: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "4px",
  },
  tooltip: {
    maxWidth: "200px",
    textAlign: "center",
    fontSize: tokens.fontSizeBase200,
  },
  emailContentContainer: {
    flex: 1,
    display: "flex",
    flexDirection: "column",
    gap: "8px",
    overflowY: "auto",
  },
  emailContent: {
    backgroundColor: tokens.colorNeutralBackground1,
    borderRadius: tokens.borderRadiusSmall,
    boxShadow: tokens.shadow2,
    display: "flex",
    flexDirection: "column",
    height: "calc(50% - 4px)", // Subtracting half of the gap
    minHeight: "100px",
  },
  emailTextContainer: {
    flex: 1,
    overflowY: "auto",
    padding: "8px",
  },
  emailText: {
    whiteSpace: "pre-wrap",
    wordBreak: "break-word",
    fontSize: tokens.fontSizeBase200,
  },
  errorText: {
    color: tokens.colorPaletteRedForeground1,
    textAlign: "center",
    padding: "8px",
    fontSize: tokens.fontSizeBase200,
  },
  spinnerContainer: {
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    padding: "8px",
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

  // ... (fetchUserConfig, useEffect, getEmailContent, and handleButtonClick remain the same)

  const getButtonIcon = (label) => {
    switch (label.toLowerCase()) {
      case "generate email": return <MailTemplate20Regular />;
      case "send email": return <Send20Regular />;
      case "summarize email": return <DocumentSearch20Regular />;
      default: return <MailTemplate20Regular />;
    }
  };

  if (isLoading) {
    return (
      <div className={styles.container}>
        <div className={styles.spinnerContainer}>
          <Spinner size="tiny" label="Loading..." />
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
        <Text className={styles.errorText}>No actions available. Contact support.</Text>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <Avatar className={styles.logo} icon={<MailTemplate20Regular />} size={24} />
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
            <Spinner size="tiny" label="Processing..." />
          </div>
        )}
        <div className={styles.emailContentContainer}>
          {originalContent && (
            <Card className={styles.emailContent}>
              <CardHeader 
                image={<Avatar icon={<DocumentSearch20Regular />} size={16} />}
                header={<Text size={200} weight="semibold">Original Email</Text>}
              />
              <Divider />
              <div className={styles.emailTextContainer}>
                <Text className={styles.emailText}>{originalContent}</Text>
              </div>
            </Card>
          )}
          {generatedContent && (
            <Card className={styles.emailContent}>
              <CardHeader 
                image={<Avatar icon={<MailTemplate20Regular />} size={16} />}
                header={<Text size={200} weight="semibold">Generated Email</Text>}
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