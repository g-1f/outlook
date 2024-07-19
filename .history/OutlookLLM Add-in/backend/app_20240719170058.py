from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Dict
import uvicorn

app = FastAPI()

# Enable CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allows all origins
    allow_credentials=True,
    allow_methods=["*"],  # Allows all methods
    allow_headers=["*"],  # Allows all headers
)

# This would typically come from a database
user_configs = {
    "user1": {
        "userId": "user1",
        "buttons": [
            {
                "label": "Generate Email",
                "icon": "SendRegular",
                "apiEndpoint": "https://localhost:8000/generate_email",
            },
            {
                "label": "Summarize Email",
                "icon": "SummarizeRegular",
                "apiEndpoint": "https://localhost:8000/summarize_email",
            },
        ],
    },
    "user2": {
        "userId": "user2",
        "buttons": [
            {
                "label": "Generate Email",
                "icon": "SendRegular",
                "apiEndpoint": "https://localhost:8000/generate_email",
            }
        ],
    },
    "default": {
        "userId": "default",
        "buttons": [
            {
                "label": "AI Assistant",
                "icon": "QuestionCircleRegular",
                "apiEndpoint": "https://localhost:8000/ai_assistant",
            }
        ],
    },
}


class EmailRequest(BaseModel):
    userId: str


@app.get("/getUserId")
async def get_user_id():
    # In a real application, this would be determined by authentication
    return {"userId": "user1"}


@app.get("/getUserConfig")
async def get_user_config():
    # In a real application, you'd get the user ID from the session or token
    user_id = "user1"
    config = user_configs.get(user_id, user_configs["default"])
    return config


@app.post("/generate_email")
async def generate_email(request: EmailRequest):
    # Implement your email generation logic here
    return {"body": f"Generated email for user {request.userId}"}


@app.post("/summarize_email")
async def summarize_email(request: EmailRequest):
    # Implement your email summarization logic here
    return {"body": f"Summarized email for user {request.userId}"}


@app.post("/ai_assistant")
async def ai_assistant(request: EmailRequest):
    # Implement your AI assistant logic here
    return {"body": f"AI Assistant response for user {request.userId}"}


if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8001)
