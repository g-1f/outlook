import React, { useState, useEffect, useCallback } from "react";
import * as AdaptiveCards from "adaptivecards";

const EmailGenerator = ({ userId = "user1" }) => {
  const [isLoading, setIsLoading] = useState(true);
  const [userConfig, setUserConfig] = useState(null);
  const [error, setError] = useState(null);
  const [selectedAction, setSelectedAction] = useState(null);
  const [inputValue, setInputValue] = useState("");

  const fetchUserConfig = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch(`http://localhost:8001/getUserConfig/${userId}`);
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      const data = await response.json();
      setUserConfig(data);
    } catch (e) {
      setError(`Failed to load user configuration: ${e.message}`);
    } finally {
      setIsLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    fetchUserConfig();
  }, [fetchUserConfig]);

  const handleAction = async (action, inputValue = null) => {
    try {
      const content = await new Promise((resolve, reject) => {
        Office.context.mailbox.item.body.getAsync(Office.CoercionType.Text, (result) => {
          if (result.status === Office.AsyncResultStatus.Succeeded) {
            resolve(result.value);
          } else {
            reject(new Error(result.error.message));
          }
        });
      });

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

      Office.context.mailbox.item.displayReplyAllForm({
        htmlBody: responseData.generatedContent || responseData.body,
      });

      setSelectedAction(null);
      setInputValue("");
    } catch (e) {
      console.error(`Error in handleAction: ${e.message}`);
    }
  };

  const renderAdaptiveCard = useCallback(() => {
    if (isLoading) {
      return <div>Loading...</div>;
    }

    if (error) {
      return <div>Error: {error}</div>;
    }

    if (!userConfig || !userConfig.buttons || userConfig.buttons.length === 0) {
      return <div>No actions available.</div>;
    }

    const cardPayload = {
      type: "AdaptiveCard",
      version: "1.3",
      body: [
        {
          type: "TextBlock",
          size: "Large",
          weight: "Bolder",
          text: "AI Email Assistant",
          wrap: true,
          horizontalAlignment: "Center"
        },
        {
          type: "ColumnSet",
          columns: userConfig.buttons.map(button => ({
            type: "Column",
            width: "stretch",
            items: [
              {
                type: "ActionSet",
                actions: [
                  {
                    type: "Action.Submit",
                    title: button.label,
                    data: button,
                    style: "positive"
                  }
                ]
              }
            ]
          }))
        }
      ]
    };

    if (selectedAction) {
      cardPayload.body.push({
        type: "Container",
        items: [
          {
            type: "Input.Text",
            id: "promptInput",
            placeholder: "Enter your prompt here...",
            isMultiline: true
          },
          {
            type: "ActionSet",
            actions: [
              {
                type: "Action.Submit",
                title: "Send",
                data: { action: "send" },
                style: "positive"
              },
              {
                type: "Action.Submit",
                title: "Cancel",
                data: { action: "cancel" },
                style: "destructive"
              }
            ]
          }
        ]
      });
    }

    const adaptiveCard = new AdaptiveCards.AdaptiveCard();
    adaptiveCard.parse(cardPayload);
    adaptiveCard.onExecuteAction = (action) => {
      const actionData = action.getData();
      if (actionData.action === "send") {
        handleAction(selectedAction, inputValue);
      } else if (actionData.action === "cancel") {
        setSelectedAction(null);
        setInputValue("");
      } else {
        setSelectedAction(actionData);
        if (!actionData.requiresInput) {
          handleAction(actionData);
        }
      }
    };

    const renderedCard = adaptiveCard.render();
    return <div ref={(el) => el && el.appendChild(renderedCard)} />;
  }, [isLoading, error, userConfig, selectedAction, inputValue, handleAction]);

  return (
    <div style={{ maxWidth: "600px", margin: "0 auto", padding: "20px" }}>
      {renderAdaptiveCard()}
    </div>
  );
};

export default EmailGenerator;