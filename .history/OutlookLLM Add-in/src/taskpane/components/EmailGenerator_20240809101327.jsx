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
  // ... (keep other styles)

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
    justifyContent: "center",
    gap: "16px",
    marginTop: "16px",
  },
  expandedActionHeader: {
    display: "flex",
    alignItems: "center",
    marginBottom: "16px",
  },
  // ... (keep other styles)
});

const EmailGenerator = ({ userId = "user1" }) => {
  // ... (keep existing state and functions)

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <IconComponent style={{marginRight: "16px", color: "#106ebe", fontSize: "32px"}} />
        <Text className={styles.title}>AWM AI Assistant</Text>
      </div>
      <div className={styles.content}>
        {selectedAction ? (
          <div className={styles.inputContainer}>
            <div className={styles.expandedActionHeader}>
              <div className={styles.iconWrapper}>
                {FluentIcons[selectedAction.icon] ? 
                  React.createElement(FluentIcons[selectedAction.icon]) : 
                  <FluentIcons.MailTemplate24Regular />
                }
              </div>
              <Text className={styles.actionTitle}>{selectedAction.label}</Text>
            </div>
            <Textarea
              className={styles.input}
              placeholder="Enter your prompt here..."
              value={inputValue}
              onChange={(e, data) => setInputValue(data.value)}
            />
            <div className={styles.buttonContainer}>
              <Button appearance="primary" onClick={() => handleAction(selectedAction, inputValue)}>Send</Button>
              <Button appearance="secondary" onClick={() => setSelectedAction(null)}>Cancel</Button>
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