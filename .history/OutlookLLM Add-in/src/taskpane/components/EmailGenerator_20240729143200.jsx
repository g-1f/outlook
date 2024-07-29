import React, { useState, useEffect, useCallback } from "react";
import * as AdaptiveCards from "adaptivecards";
import * as ACData from "adaptivecards-templating";

const EmailGenerator = ({ userId = "user1" }) => {
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
            body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; }
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

  const cardTemplate = {
    type: "AdaptiveCard",
    version: "1.5",
    body: [
      {
        type: "Container",
        items: [
          {
            type: "TextBlock",
            size: "Large",
            weight: "Bolder",
            text: "AI Email Assistant",
            horizontalAlignment: "Center",
            color: "Accent",
            spacing: "Large"
          },
          {
            type: "TextBlock",
            text: "Select an action to get started:",
            horizontalAlignment: "Center",
            spacing: "Medium"
          }
        ],
        style: "emphasis",
        bleed: true
      },
      {
        type: "Container",
        items: [
          {
            type: "ActionSet",
            actions: []  // We'll populate this dynamically
          }
        ],
        $when: "${!selectedAction}"
      },
      {
        type: "Container",
        items: [
          {
            type: "TextBlock",
            text: "${selectedAction.label}",
            weight: "Bolder",
            size: "Medium",
            color: "Accent"
          },
          {
            type: "Input.Text",
            id: "prompt",
            placeholder: "Enter your prompt here...",
            isMultiline: true,
            style: "text"
          },
          {
            type: "ActionSet",
            actions: [
              {
                type: "Action.Submit",
                title: "Send",
                style: "positive",
                data: { action: "send" }
              },
              {
                type: "Action.Submit",
                title: "Cancel",
                style: "destructive",
                data: { action: "cancel" }
              }
            ]
          }
        ],
        $when: "${selectedAction}"
      },
      {
        type: "TextBlock",
        text: "${statusMessage}",
        color: "Good",
        horizontalAlignment: "Center",
        spacing: "Medium",
        $when: "${statusMessage}"
      },
      {
        type: "TextBlock",
        text: "${error}",
        color: "Attention",
        horizontalAlignment: "Center",
        spacing: "Medium",
        $when: "${error}"
      }
    ]
  };

  const renderAdaptiveCard = useCallback(() => {
    if (isLoading) {
      return <div>Loading user configuration...</div>;
    }

    if (error) {
      return <div>Error: {error}</div>;
    }

    if (!userConfig || !userConfig.buttons || userConfig.buttons.length === 0) {
      return <div>No actions available. Please contact support.</div>;
    }

    const template = new ACData.Template(cardTemplate);
    
    const actions = userConfig.buttons.map(action => ({
      type: "Action.Submit",
      title: action.label,
      style: "default",
      iconUrl: action.icon,
      data: { action: action.label }
    }));

    const cardPayload = template.expand({
      $root: {
        selectedAction,
        actions,
        statusMessage,
        error
      }
    });

    // Create an AdaptiveCard instance
    const adaptiveCard = new AdaptiveCards.AdaptiveCard();

    // Set host config
    adaptiveCard.hostConfig = new AdaptiveCards.HostConfig({
      fontFamily: "Segoe UI, Helvetica Neue, sans-serif",
      spacing: {
        small: 3,
        default: 8,
        medium: 20,
        large: 30,
        extraLarge: 40,
        padding: 20
      },
      separator: {
        lineThickness: 1,
        lineColor: "#EEEEEE"
      },
      supportsInteractivity: true,
      fontSizes: {
        small: 12,
        default: 14,
        medium: 17,
        large: 21,
        extraLarge: 26
      },
      containerStyles: {
        default: {
          backgroundColor: "#FFFFFF",
          foregroundColors: {
            default: {
              default: "#333333",
              subtle: "#666666"
            },
            accent: {
              default: "#106ebe",
              subtle: "#106ebe"
            },
            attention: {
              default: "#D92B2B",
              subtle: "#D92B2B"
            },
            good: {
              default: "#107C10",
              subtle: "#107C10"
            }
          }
        },
        emphasis: {
          backgroundColor: "#F0F0F0",
          foregroundColors: {
            default: {
              default: "#333333",
              subtle: "#666666"
            },
            accent: {
              default: "#106ebe",
              subtle: "#106ebe"
            }
          }
        }
      },
      imageSizes: {
        small: 40,
        medium: 80,
        large: 160
      },
      actions: {
        maxActions: 5,
        spacing: "default",
        buttonSpacing: 10,
        showCard: {
          actionMode: "inline",
          inlineTopMargin: 16
        },
        actionsOrientation: "horizontal",
        actionAlignment: "stretch"
      }
    });

    // Parse the card payload
    adaptiveCard.parse(cardPayload);

    // Set up the onExecuteAction callback
    adaptiveCard.onExecuteAction = onExecuteAction;

    // Render the card
    const renderedCard = adaptiveCard.render();

    // Return the rendered card wrapped in a div
    return <div ref={(el) => el && el.appendChild(renderedCard)} />;
  }, [isLoading, error, userConfig, selectedAction, statusMessage, onExecuteAction]);

  const onExecuteAction = (action) => {
    const actionData = action.getData();
    if (actionData.action === "send") {
      handleAction(selectedAction, inputValue);
    } else if (actionData.action === "cancel") {
      setSelectedAction(null);
      setInputValue("");
    } else {
      const selectedButton = userConfig.buttons.find(button => button.label === actionData.action);
      if (selectedButton) {
        if (selectedButton.requiresInput) {
          setSelectedAction(selectedButton);
        } else {
          handleAction(selectedButton);
        }
      }
    }
  };

  return (
    <div style={{ maxWidth: "600px", margin: "0 auto", padding: "20px" }}>
      {renderAdaptiveCard()}
    </div>
  );
};

export default EmailGenerator;