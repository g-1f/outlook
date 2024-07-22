from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from typing import List, Dict
import uvicorn
import logging

app = FastAPI()

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

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
                "apiEndpoint": "http://localhost:8001/generate_email",
                "description": "AI will generate a complete email based on the current context.",
            },
            {
                "label": "Summarize Email",
                "icon": "SummarizeRegular",
                "apiEndpoint": "http://localhost:8001/summarize_email",
                "description": "AI will provide a concise summary of the current email.",
            },
        ],
    },
    "user2": {
        "userId": "user2",
        "buttons": [
            {
                "label": "Generate Email",
                "icon": "SendRegular",
                "apiEndpoint": "http://localhost:8001/generate_email",
                "description": "AI will generate a complete email based on the current context.",
            }
        ],
    },
    "default": {
        "userId": "default",
        "buttons": [
            {
                "label": "AI Assistant",
                "icon": "QuestionCircleRegular",
                "apiEndpoint": "http://localhost:8001/ai_assistant",
                "description": "AI will generate a complete email based on the current context.",
            }
        ],
    },
}


class EmailRequest(BaseModel):
    userId: str
    emailContent: str


class EmailResponse(BaseModel):
    originalContent: str
    generatedContent: str = ""  # This will be used later for LLM-generated content


@app.get("/getUserId")
async def get_user_id():
    logger.info("Received request for getUserId")
    return {"userId": "user1"}


@app.get("/getUserConfig")
async def get_user_config():
    logger.info("Received request for getUserConfig")
    try:
        user_id = "user1"
        config = user_configs.get(user_id, user_configs["default"])
        logger.info(f"Returning config for user: {user_id}")
        return JSONResponse(content=config)
    except Exception as e:
        logger.error(f"Error in getUserConfig: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/generate_email", response_model=EmailResponse)
async def generate_email(request: EmailRequest):
    logger.info(f"Received generate_email request for user: {request.userId}")
    try:
        # For now, we're just echoing back the original content
        # Later, we'll add LLM processing here
        return EmailResponse(originalContent=request.emailContent)
    except Exception as e:
        logger.error(f"Error in generate_email: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/summarize_email")
async def summarize_email(request: EmailRequest):
    logger.info(f"Received summarize_email request for user: {request.userId}")
    return {"body": f"Summarized email for user {request.userId}"}


@app.post("/ai_assistant")
async def ai_assistant(request: EmailRequest):
    logger.info(f"Received ai_assistant request for user: {request.userId}")
    return {"body": f"AI Assistant response for user {request.userId}"}


if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8001)
