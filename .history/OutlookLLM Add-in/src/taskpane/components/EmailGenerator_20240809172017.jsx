<div className={styles.statusContainer}>
{isProcessing && (
  <div className={styles.statusMessage}>
    <Spinner size="tiny" />
    <span style={{ marginLeft: '8px' }}>Processing your request...</span>
  </div>
)}
{statusMessage && (
  <div className={`${styles.statusMessage} ${styles.successMessage}`}>
    <div>{statusMessage.text}</div>
    {statusMessage.link && (
      <a 
        href={statusMessage.link.url} 
        target="_blank" 
        rel="noopener noreferrer" 
        className={styles.link}
      >
        {statusMessage.link.text}
      </a>
    )}
  </div>
)}
{error && (
  <div className={`${styles.statusMessage} ${styles.errorMessage}`}>
    {error}
  </div>
)}
</div>