import json
import re
from pathlib import Path

import requests
from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel


# =========================================================
# PATH CONFIGURATION
# =========================================================

BASE_DIR = Path(__file__).resolve().parent
PROJECT_DIR = BASE_DIR.parent
FRONTEND_DIR = PROJECT_DIR / "frontend"
UPLOAD_DIR = BASE_DIR / "uploads"

UPLOAD_DIR.mkdir(exist_ok=True)


# =========================================================
# OLLAMA CONFIGURATION
# =========================================================

OLLAMA_URL = "http://127.0.0.1:11434"

# Change this if your local model has a different name.
OLLAMA_MODEL = "llama3.2:1b"


# =========================================================
# FASTAPI
# =========================================================

app = FastAPI(
    title="Assignment Assistant AI",
    version="1.0.0"
)


# =========================================================
# CORS
# =========================================================

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"]
)


# =========================================================
# FRONTEND
# =========================================================

app.mount(
    "/static",
    StaticFiles(directory=FRONTEND_DIR),
    name="static"
)


@app.get("/")
def home():

    index_file = FRONTEND_DIR / "index.html"

    if not index_file.exists():
        raise HTTPException(
            status_code=404,
            detail="frontend/index.html not found"
        )

    return FileResponse(index_file)


# =========================================================
# REQUEST MODEL
# =========================================================

class QuestionRequest(BaseModel):

    question: str

    subject: str = "Auto Detect"

    answer_style: str = "Student Friendly"

    answer_length: str = "Detailed"


# =========================================================
# HEALTH CHECK
# =========================================================

@app.get("/api/health")
def health_check():

    try:

        response = requests.get(
            f"{OLLAMA_URL}/api/tags",
            timeout=5
        )

        if response.status_code == 200:

            models = response.json().get("models", [])

            return {
                "success": True,
                "ollama": True,
                "model": OLLAMA_MODEL,
                "installed_models": [
                    model.get("name")
                    for model in models
                ]
            }

    except Exception as e:

        return {
            "success": False,
            "ollama": False,
            "message": str(e)
        }

    return {
        "success": False,
        "ollama": False,
        "message": "Ollama is not responding."
    }


# =========================================================
# OLLAMA CALL
# =========================================================

def ask_ollama(prompt: str):

    payload = {

        "model": OLLAMA_MODEL,

        "prompt": prompt,

        "stream": False,

        "options": {
            "temperature": 0.2
        }
    }

    try:

        response = requests.post(
            f"{OLLAMA_URL}/api/generate",
            json=payload,
            timeout=300
        )

    except requests.exceptions.ConnectionError:

        raise HTTPException(
            status_code=503,
            detail=(
                "Cannot connect to Ollama. "
                "Make sure Ollama is running."
            )
        )

    except requests.exceptions.Timeout:

        raise HTTPException(
            status_code=504,
            detail="Ollama took too long to respond."
        )

    if response.status_code != 200:

        raise HTTPException(
            status_code=500,
            detail=response.text
        )

    data = response.json()

    return data.get("response", "")


# =========================================================
# CLEAN JSON
# =========================================================

def extract_json(text: str):

    text = text.strip()

    # Remove markdown code fences

    text = re.sub(
        r"```json",
        "",
        text,
        flags=re.IGNORECASE
    )

    text = re.sub(
        r"```",
        "",
        text
    )

    text = text.strip()

    try:

        return json.loads(text)

    except json.JSONDecodeError:

        # Try to find JSON object

        start = text.find("{")
        end = text.rfind("}")

        if start != -1 and end != -1:

            json_text = text[start:end + 1]

            try:

                return json.loads(json_text)

            except json.JSONDecodeError:
                pass

    return None


# =========================================================
# ASSIGNMENT PROMPT
# =========================================================

def create_assignment_prompt(
    question,
    subject,
    answer_style,
    answer_length
):

    prompt = f"""
You are an Assignment Assistant AI.

You help college students understand academic questions
and prepare clear assignment answers.

USER QUESTION:
{question}

SUBJECT:
{subject}

ANSWER STYLE:
{answer_style}

ANSWER LENGTH:
{answer_length}


IMPORTANT INSTRUCTIONS:

1. Automatically identify the subject if Subject is
   "Auto Detect".

2. Automatically identify the main topic.

3. Give a clear assignment-ready answer.

4. Explain the concept in simple language.

5. Use technical terminology when necessary.

6. Give examples when useful.

7. For programming questions, provide correct code.

8. Explain important parts of the code.

9. For mathematical questions, show the steps.

10. For SQL questions, provide a correct SQL query.

11. Do not invent information.

12. Do not claim that you used external sources.

13. Keep the answer suitable for a college assignment.

14. Do not make the answer unnecessarily complicated.


RETURN ONLY VALID JSON.

Use EXACTLY this structure:

{{
    "subject": "string",
    "topic": "string",
    "answer": "string",
    "explanation": "string",
    "example": "string",
    "code": "string",
    "key_points": [
        "string"
    ],
    "important_terms": [
        "string"
    ],
    "references": [
        "string"
    ]
}}

If code is not applicable, return:

"code": ""

If references are not appropriate, return:

"references": []
"""

    return prompt


# =========================================================
# ASK ASSIGNMENT QUESTION
# =========================================================

@app.post("/api/ask")
def ask_question(request: QuestionRequest):

    question = request.question.strip()

    if not question:

        raise HTTPException(
            status_code=400,
            detail="Question cannot be empty."
        )

    prompt = create_assignment_prompt(
        question,
        request.subject,
        request.answer_style,
        request.answer_length
    )

    raw_response = ask_ollama(prompt)

    result = extract_json(raw_response)

    if result is None:

        # Fallback if local model does not return JSON

        return {
            "success": True,
            "data": {
                "subject": request.subject,
                "topic": "General",
                "answer": raw_response,
                "explanation": "",
                "example": "",
                "code": "",
                "key_points": [],
                "important_terms": [],
                "references": []
            }
        }

    return {
        "success": True,
        "data": result
    }


# =========================================================
# FILE TEXT EXTRACTION
# =========================================================

def extract_file_text(file_path: Path):

    extension = file_path.suffix.lower()

    # -----------------------------------------------------
    # TXT
    # -----------------------------------------------------

    if extension == ".txt":

        return file_path.read_text(
            encoding="utf-8",
            errors="ignore"
        )


    # -----------------------------------------------------
    # PDF
    # -----------------------------------------------------

    if extension == ".pdf":

        try:

            from pypdf import PdfReader

            reader = PdfReader(str(file_path))

            pages = []

            for page in reader.pages:

                text = page.extract_text()

                if text:
                    pages.append(text)

            return "\n".join(pages)

        except Exception as e:

            raise HTTPException(
                status_code=500,
                detail=f"PDF extraction failed: {str(e)}"
            )


    # -----------------------------------------------------
    # DOCX
    # -----------------------------------------------------

    if extension == ".docx":

        try:

            from docx import Document

            document = Document(str(file_path))

            paragraphs = []

            for paragraph in document.paragraphs:

                if paragraph.text.strip():

                    paragraphs.append(
                        paragraph.text
                    )

            return "\n".join(paragraphs)

        except Exception as e:

            raise HTTPException(
                status_code=500,
                detail=f"DOCX extraction failed: {str(e)}"
            )


    raise HTTPException(
        status_code=400,
        detail=(
            "Unsupported file type. "
            "Use PDF, DOCX or TXT."
        )
    )


# =========================================================
# UPLOAD ASSIGNMENT
# =========================================================

@app.post("/api/upload")
async def upload_assignment(
    file: UploadFile = File(...)
):

    allowed_extensions = {
        ".pdf",
        ".docx",
        ".txt"
    }

    extension = Path(
        file.filename
    ).suffix.lower()

    if extension not in allowed_extensions:

        raise HTTPException(
            status_code=400,
            detail=(
                "Only PDF, DOCX and TXT files "
                "are supported."
            )
        )


    safe_filename = Path(
        file.filename
    ).name

    file_path = UPLOAD_DIR / safe_filename


    content = await file.read()

    file_path.write_bytes(content)


    extracted_text = extract_file_text(
        file_path
    )


    return {
        "success": True,
        "filename": safe_filename,
        "text": extracted_text[:50000]
    }


# =========================================================
# GENERATE STUDY NOTES
# =========================================================

@app.post("/api/study-notes")
def generate_study_notes(request: QuestionRequest):

    question = request.question.strip()

    if not question:

        raise HTTPException(
            status_code=400,
            detail="Content cannot be empty."
        )


    prompt = f"""
You are a college study-notes assistant.

Create useful study notes from the following content.

CONTENT:

{question}

Return the notes in a clear structure:

1. Topic
2. Introduction
3. Important concepts
4. Definitions
5. Key points
6. Examples
7. Important exam points
8. Short revision summary

Use simple student-friendly language.

Do not invent facts.

Return normal formatted text.
"""


    answer = ask_ollama(prompt)


    return {
        "success": True,
        "answer": answer
    }