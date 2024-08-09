return (
  <div className={styles.container}>
    <div className={styles.header}>
      <IconComponent style={{marginRight: "16px", color: "#106ebe", fontSize: "32px"}} />
      <Text className={styles.title}>AWM AI Assistant</Text>
    </div>
    <div className={styles.content}>
      {selectedAction ? (
        <div className={styles.expandedActionBar}>
          <div className={styles.expandedActionContent}>
            <div style={{ display: "flex", alignItems: "center" }}>
              <div className={styles.iconWrapper}>
                {FluentIcons[selectedAction.icon] ? 
                  React.createElement(FluentIcons[selectedAction.icon]) : 
                  <FluentIcons.MailTemplate24Regular />
                }
              </div>
              <Text className={styles.actionTitle}>{selectedAction.label}</Text>
            </div>
            <Text className={styles.actionDescription}>{selectedAction.description}</Text>
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
