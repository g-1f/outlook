import * as React from "react";
import { useState, useEffect } from "react";
import { Button, Text, Spinner, makeStyles } from "@fluentui/react-components";
import * as FluentIcons from "@fluentui/react-icons";

const useStyles = makeStyles({
  container: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    width: "100%",
    maxWidth: "300px",
    padding: "20px",
    boxSizing: "border-box",
    backgroundColor: "white",
    borderRadius: "8px",
    boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
  },
  title: {
    fontSize: "24px",
    fontWeight: "bold",
    marginBottom: "20px",
    textAlign: "center",
    color: "#333",
  },
  button: {
    minWidth: "200px",
    height: "40px",
    marginTop: "10px",
  },
  buttonText: {
    textAlign: "center",
    width: "100%",
  },
  emailContent: {
    marginTop: "20px",
    width: "100%",
    textAlign: "left",
    maxHeight: "300px",
    overflowY: "auto",
    padding: "10px",
    border: "1px solid #ddd",
    borderRadius: "4px",
  },
});

const EmailGenerator = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [userConfig, setUserConfig] = useState(null);
  const [error, setError] = useState(null);
  const [emailContent, setEmailContent] = useState(null);
  const styles = useStyles();

  useEffect(() => {
    const fetchUserConfig = async () => {
      try {
        console.log('Fetching user configuration...');
        const response = await fetch("http://localhost:8001/getUserConfig");
        
        if (!response.ok) {
          const errorText = await response.text();
          console.error(`Server responded with ${response.status}: ${errorText}`);
          throw new Error(`Failed to fetch user configuration: ${response.statusText}`);
        }
  
        const contentType = response.headers.get("content-type");
        if (!contentType || !contentType.includes("application/json")) {
          console.error(`Received non-JSON response: ${contentType}`);
          throw new Error("Received non-JSON response from server");
        }
  
        const data = await response.json();
        console.log('Received user configuration:', data);
        setUserConfig(data);
      } catch (error) {
        console.error("Error fetching user configuration:", error);
        setError("Failed to load user configuration. Please try again later.");
      } finally {
        setIsLoading(false);
      }
    };
  
    fetchUserConfig();
  }, []);

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

  const handleButtonClick = async (buttonConfig) => {
    setIsLoading(true);
    setError(null);
    setEmailContent(null);
    try {
      const content = await getEmailContent();
      console.log(`Sending request to: ${buttonConfig.apiEndpoint}`);
      
      const response = await fetch(buttonConfig.apiEndpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ 
          userId: userConfig.userId,
          emailContent: content
        }),
      });
  
      if (!response.ok) {
        const errorText = await response.text();
        console.error(`Server responded with ${response.status}: ${errorText}`);
        throw new Error(`Failed to ${buttonConfig.label.toLowerCase()}`);
      }
  
      const responseData = await response.json();
      console.log(`Received response:`, responseData);
      
      setEmailContent(responseData.originalContent);
    } catch (error) {
      console.error(`Error in handleButtonClick: ${error.message}`);
      setError(`Failed to ${buttonConfig.label.toLowerCase()}. Please try again.`);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return <Spinner label="Loading user data..." />;
  }

  if (error) {
    return <Text>{error}</Text>;
  }

  if (!userConfig || !userConfig.buttons || userConfig.buttons.length === 0) {
    return <Text>No actions available. Please contact support.</Text>;
  }

  return (
    <div className={styles.container}>
      <Text className={styles.title}>AI Email Assistant</Text>
      {userConfig.buttons.map((buttonConfig, index) => {
        const IconComponent = FluentIcons[buttonConfig.icon] || FluentIcons.QuestionCircleRegular;
        return (
          <Button
            key={index}
            appearance="primary"
            className={styles.button}
            disabled={isLoading}
            onClick={() => handleButtonClick(buttonConfig)}
            icon={<IconComponent />}
          >
            <span className={styles.buttonText}>
              {buttonConfig.label}
            </span>
          </Button>
        );
      })}
      {error && <Text style={{ color: 'red', marginTop: '10px' }}>{error}</Text>}
      {emailContent && (
        <div className={styles.emailContent}>
          <Text>{emailContent}</Text>
        </div>
      )}
    </div>
  );
};

export default EmailGenerator;