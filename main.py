import os
import shutil
import tempfile
from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

app = FastAPI(title="Call Analyzer API", version="1.0.0")

# 1. CORS Setup (Frontend connection error fix)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Production me apka frontend domain replace karein
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Allowed audio extensions
ALLOWED_EXTENSIONS = {".mp3", ".wav", ".m4a", ".ogg", ".flac"}


@app.get("/")
def read_root():
    return {"status": "online", "message": "Call Analyzer API is running!"}


@app.post("/analyze")
async def analyze_call(file: UploadFile = File(...)):
    # 2. File validation check
    file_ext = os.path.splitext(file.filename)[1].lower()
    if file_ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid file format '{file_ext}'. Allowed formats: {', '.join(ALLOWED_EXTENSIONS)}"
        )

    temp_file_path = None
    try:
        # 3. Save uploaded file safely to temp directory
        with tempfile.NamedTemporaryFile(delete=False, suffix=file_ext) as temp_file:
            shutil.copyfileobj(file.file, temp_file)
            temp_file_path = temp_file.name

        # --- YOUR AI / AUDIO ANALYSIS LOGIC HERE ---
        # Demo response logic (Replace this block with your actual AI/Whisper code)
        analysis_result = {
            "file_name": file.filename,
            "duration": "02:45",
            "sentiment": "Positive",
            "summary": "Customer called regarding account inquiry. Issue was resolved smoothly.",
            "key_takeaways": [
                "Customer satisfied with support",
                "No follow-up required"
            ],
            "transcription": "Hello, I need help with my account... Thank you, that solved it!"
        }
        # -------------------------------------------

        return analysis_result

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Processing failed: {str(e)}")

    finally:
        # 4. Clean up temporary files to avoid server storage bugs
        if temp_file_path and os.path.exists(temp_file_path):
            os.remove(temp_file_path)


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="127.0.0.1", port=8000, reload=True)
