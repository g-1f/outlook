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
    boxSizing: "border-box",
    backgroundColor: tokens.colorNeutralBackground1,
    ...shorthands.margin(0),
    ...shorthands.padding(0),
  },
  content: {
    display: "flex",
    flexDirection: "column",
    alignItems: "stretch",
    ...shorthands.padding(tokens.spacingVerticalM),
    ...shorthands.gap(tokens.spacingVerticalM),
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
    ...shorthands.gap(tokens.spacingVerticalS),
  },
  button: {
    width: "100%",
  },
  emailContent: {
    flex: 1,
    minHeight: 0,
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

  // ... (useEffect and other functions remain the same)

  if (isLoading) {
    return (
      <div className={styles.container}>
        <div className={styles.content}>
          <Spinner label="Loading..." />
        </div>
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
        <Text className={styles.title}>AI Email Assistant</Text>
        <div className={styles.buttonsContainer}>
          {userConfig.buttons.map((buttonConfig, index) => {
            const IconComponent = FluentIcons[buttonConfig.icon] || FluentIcons.QuestionCircleRegular;
            return (
              <Tooltip content={`Click to ${buttonConfig.label.toLowerCase()}`} relationship="label" key={index}>
                <Button
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
    </div>
  );
};

export default EmailGenerator;