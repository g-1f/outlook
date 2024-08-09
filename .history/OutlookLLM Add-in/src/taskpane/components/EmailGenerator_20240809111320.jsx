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

    if (responseData.generatedContent == null && responseData.body == null) {
      throw new Error("No content received from the server");
    }

    const contentToWrap = responseData.generatedContent || responseData.body;
    console.log("Content to wrap:", contentToWrap);

    const htmlContent = wrapInHtml(contentToWrap);

    Office.context.mailbox.item.displayReplyAllForm({
      htmlBody: htmlContent,
    });

    setStatusMessage(`${action.label} completed successfully!`);
    setSelectedAction(null);
    setInputValue("");
  } catch (e) {
    console.error(`Error in handleAction: ${e.message}`);
    setError(`Failed to ${action.label.toLowerCase()}. Please try again. Error: ${e.message}`);
  } finally {
    setIsProcessing(false);
  }
};
