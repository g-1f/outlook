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
  Divider
} from "@fluentui/react-components";

const useStyles = makeStyles({
  container: {
    display: "flex",
    flexDirection: "column",
    width: "100%",
    height: "100vh",
    backgroundColor: tokens.colorNeutralBackground3,
    ...shorthands.padding("20px"),
    boxSizing: "border-box",
  },
  content: {
    display: "flex",
    flexDirection: "column",
    gap: "24px",
    height: "100%",
  },
  titleContainer: {
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: "24px",
  },
  title: {
    fontSize: tokens.fontSizeBase800,
    fontWeight: tokens.fontWeightSemibold,
    color: tokens.colorNeutralForeground1,
  },
  buttonsContainer: {
    display: "flex",
    flexDirection: "row",
    justifyContent: "center",
    flexWrap: "wrap",
    gap: "12px",
  },
  button: {
    minWidth: "120px",
    height: "40px",
    flex: "1 1 auto",
    maxWidth: "200px",
    justifyContent: "center",
    fontSize: tokens.fontSizeBase300,
    fontWeight: tokens.fontWeightSemibold,
  },
  emailContent: {
    flex: 1,
    overflowY: "auto",
    backgroundColor: tokens.colorNeutralBackground1,
    ...shorthands.borderRadius("4px"),
    boxShadow: tokens.shadow4,
  },
  emailText: {
    padding: "16px",
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
});

const EmailGenerator = () => {
  // ... (state and other functions remain the same)

  return (
    <div className={styles.container}>
      <div className={styles.content}>
        <div className={styles.titleContainer}>
          <Text className={styles.title}>AI Email Assistant</Text>
        </div>
        <div className={styles.buttonsContainer}>
          {userConfig.buttons.map((buttonConfig, index) => (
            <Button
              key={index}
              appearance="primary"
              className={styles.button}
              disabled={isProcessing}
              onClick={() => handleButtonClick(buttonConfig)}
            >
              {buttonConfig.label}
            </Button>
          ))}
        </div>
        {isProcessing && (
          <div className={styles.spinnerContainer}>
            <Spinner size="small" label="Processing..." />
          </div>
        )}
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