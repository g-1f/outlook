// import React, { useState, useEffect, useCallback, useRef } from "react";
// import * as AdaptiveCards from "adaptivecards";

// const EmailGenerator = ({ userId = "user1" }) => {
//   const [isLoading, setIsLoading] = useState(true);
//   const [userConfig, setUserConfig] = useState(null);
//   const [error, setError] = useState(null);
//   const [selectedAction, setSelectedAction] = useState(null);
//   const [inputValue, setInputValue] = useState("");

//   const cardContainerRef = useRef(null); // Ref to the container for the adaptive card

//   const fetchUserConfig = useCallback(async () => {
//     setIsLoading(true);
//     setError(null);
//     try {
//       const response = await fetch(`http://localhost:8001/getUserConfig/${userId}`);
//       if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
//       const data = await response.json();
//       setUserConfig(data);
//     } catch (e) {
//       setError(`Failed to load user configuration: ${e.message}`);
//     } finally {
//       setIsLoading(false);
//     }
//   }, [userId]);

//   useEffect(() => {
//     fetchUserConfig();
//   }, [fetchUserConfig]);

//   useEffect(() => {
//     if (!isLoading && !error) {
//       renderAdaptiveCard();
//     }
//   }, [isLoading, error, userConfig, selectedAction, inputValue]); // Rerender card on these dependencies

//   const handleAction = async (action, inputValue = null) => {
//     try {
//       const content = await new Promise((resolve, reject) => {
//         Office.context.mailbox.item.body.getAsync(Office.CoercionType.Text, (result) => {
//           if (result.status === Office.AsyncResultStatus.Succeeded) {
//             resolve(result.value);
//           } else {
//             reject(new Error(result.error.message));
//           }
//         });
//       });

//       const payload = {
//         userId: userConfig.userId,
//         emailContent: content,
//         ...(inputValue && { prompt: inputValue }),
//       };

//       const response = await fetch(action.apiEndpoint, {
//         method: "POST",
//         headers: { "Content-Type": "application/json" },
//         body: JSON.stringify(payload),
//       });

//       if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
//       const responseData = await response.json();

//       Office.context.mailbox.item.displayReplyAllForm({
//         htmlBody: responseData.generatedContent || responseData.body,
//       });

//       setSelectedAction(null);
//       setInputValue("");
//     } catch (e) {
//       console.error(`Error in handleAction: ${e.message}`);
//     }
//   };

//   const renderAdaptiveCard = () => {
//     if (isLoading) {
//       return <div>Loading...</div>;
//     }

//     if (error) {
//       return <div>Error: {error}</div>;
//     }

//     if (!userConfig || !userConfig.buttons || userConfig.buttons.length === 0) {
//       return <div>No actions available.</div>;
//     }

//     // Clear existing content in the container
//     if (cardContainerRef.current) {
//       cardContainerRef.current.innerHTML = '';
//     }

//     const cardPayload = {
//       "type": "AdaptiveCard",
//       "version": "1.3",
//       "body": [
//         {
//           "type": "TextBlock",
//           "size": "Large",
//           "weight": "Bolder",
//           "text": "AI Email Assistant",
//           "wrap": true,
//           "horizontalAlignment": "Center"
//         },
//         {
//           "type": "ColumnSet",
//           "columns": userConfig.buttons.map(button => ({
//             "type": "Column",
//             "width": "stretch",
//             "items": [
//               {
//                 "type": "ActionSet",
//                 "actions": [
//                   {
//                     "type": "Action.Submit",
//                     "title": button.label,
//                     "data": button,
//                     "style": "positive"
//                   }
//                 ]
//               }
//             ]
//           }))
//         }
//       ]
//     };

//     if (selectedAction) {
//       cardPayload.body.push({
//         "type": "Container",
//         "items": [
//           {
//             "type": "Input.Text",
//             "id": "promptInput",
//             "placeholder": "Enter your prompt here...",
//             "isMultiline": true
//           },
//           {
//             "type": "ActionSet",
//             "actions": [
//               {
//                 "type": "Action.Submit",
//                 "title": "Send",
//                 "data": { action: "send" },
//                 "style": "positive"
//               },
//               {
//                 "type": "Action.Submit",
//                 "title": "Cancel",
//                 "data": { action: "cancel" },
//                 "style": "destructive"
//               }
//             ]
//           }
//         ]
//       });
//     }

//     const adaptiveCard = new AdaptiveCards.AdaptiveCard();
//     adaptiveCard.parse(cardPayload);
//     adaptiveCard.onExecuteAction = (action) => {
//       const actionData = action.getData();
//       if (actionData.action === "send") {
//         handleAction(selectedAction, inputValue);
//       } else if (actionData.action === "cancel") {
//         setSelectedAction(null);
//         setInputValue("");
//       } else {
//         setSelectedAction(actionData);
//         if (!actionData.requiresInput) {
//           handleAction(actionData);
//         }
//       }
//     };

//     const renderedCard = adaptiveCard.render();
//     cardContainerRef.current.appendChild(renderedCard);
//   };

//   return (
//     <div ref={cardContainerRef} style={{ maxWidth: "600px", margin: "0 auto", padding: "20px", textAlign: "center" }}>
//       {isLoading && <div>Loading...</div>}
//       {error && <div style={{ color: "red" }}>Error: {error}</div>}
//       {!isLoading && !userConfig && <div>No actions available.</div>}
//     </div>
//   );
// };

// export default EmailGenerator;


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
});

const EmailGenerator = ({ userId = "user1" }) => {
  const styles = useStyles();
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [userConfig, setUserConfig] = useState(null);
  const [error, setError] = useState(null);
  const [statusMessage, setStatusMessage] = useState("");

  // ... (keep existing useEffect, getEmailDetails, and other functions)

  const handleAction = async (action) => {
    // ... (keep existing handleAction logic)
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
        {userConfig && userConfig.buttons && userConfig.buttons.map((action, index) => (
          <div 
            key={index} 
            className={styles.actionBar}
            onClick={() => handleAction(action)}
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