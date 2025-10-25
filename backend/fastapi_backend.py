import os, pytesseract, uuid, io, asyncio
from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import JSONResponse
from PIL import Image
from deep_translator import GoogleTranslator

from .extract_module import extract_text
from .text_to_speech import text_to_speech

# ----------------- Tesseract -----------------
# Updated for Railway deployment
TESSDATA_DIR = os.getenv("TESSDATA_PREFIX", "./tessdata")
pytesseract.pytesseract.tesseract_cmd = os.getenv("TESSERACT_CMD", "tesseract")
os.environ["TESSDATA_PREFIX"] = TESSDATA_DIR

# ----------------- FastAPI -----------------
app = FastAPI(title="ಚಿತ್ರವಚಕ API", version="1.3.1")

# ----------------- CORS -----------------
origins = [
    "https://jade-queijadas-455bcd.netlify.app",  # ✅ Your Netlify frontend
    "https://chitravachaka-production.up.railway.app",  # ✅ Your Railway backend
    "http://localhost:3000",  # for local dev
    "http://127.0.0.1:5500"   # for testing locally
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"]
)

# ----------------- Static folders -----------------
os.makedirs("static/audio", exist_ok=True)
os.makedirs("static/uploads", exist_ok=True)

# ----------------- Async helpers -----------------
async def async_tts(text, lang, filename):
    loop = asyncio.get_event_loop()
    return await loop.run_in_executor(None, text_to_speech, text, lang, filename)

async def async_translate(text, target_lang):
    loop = asyncio.get_event_loop()
    return await loop.run_in_executor(
        None,
        GoogleTranslator(source='kn', target=target_lang).translate,
        text
    )

# ----------------- Endpoints -----------------
@app.get("/")
async def root():
    return {"message": "ಚಿತ್ರವಚಕ API is running!", "status": "healthy"}

@app.get("/health")
async def health_check():
    return {"status": "healthy"}

@app.post("/process/")
async def process_image(file: UploadFile = File(...)):
    if not file.content_type.startswith('image/'):
        raise HTTPException(status_code=400, detail="File must be an image")

    contents = await file.read()
    if not contents:
        raise HTTPException(status_code=400, detail="Empty file")

    # Save uploaded image
    upload_filename = f"{uuid.uuid4().hex}.jpg"
    upload_path = f"static/uploads/{upload_filename}"
    with open(upload_path, "wb") as f:
        f.write(contents)

    image = Image.open(io.BytesIO(contents))
    if image.mode != 'RGB':
        image = image.convert('RGB')

    # OCR extraction
    text_kn = extract_text(image, upload_filename)
    if not text_kn.strip():
        return JSONResponse({
            "image_url": f"/static/uploads/{upload_filename}",
            "text_kn": "",
            "audio_kn": None,
            "text_en": "",
            "audio_en": None,
            "text_hi": "",
            "audio_hi": None,
            "error": "No text found"
        })

    # Generate audio filenames
    audio_kn_file = f"static/audio/{uuid.uuid4().hex}_kn.mp3"
    audio_en_file = f"static/audio/{uuid.uuid4().hex}_en.mp3"
    audio_hi_file = f"static/audio/{uuid.uuid4().hex}_hi.mp3"

    # Run translation + TTS concurrently
    trans_en_task = asyncio.create_task(async_translate(text_kn, 'en'))
    trans_hi_task = asyncio.create_task(async_translate(text_kn, 'hi'))
    tts_kn_task = asyncio.create_task(async_tts(text_kn, 'kn', audio_kn_file))

    text_en, text_hi = await asyncio.gather(trans_en_task, trans_hi_task)
    tts_en_task = asyncio.create_task(async_tts(text_en, 'en', audio_en_file))
    tts_hi_task = asyncio.create_task(async_tts(text_hi, 'hi', audio_hi_file))
    await asyncio.gather(tts_kn_task, tts_en_task, tts_hi_task)

    return {
        "image_url": f"/static/uploads/{upload_filename}",
        "text_kn": text_kn,
        "audio_kn": f"/{audio_kn_file}",
        "text_en": text_en,
        "audio_en": f"/{audio_en_file}",
        "text_hi": text_hi,
        "audio_hi": f"/{audio_hi_file}",
        "error": None
    }

# ----------------- Serve static files -----------------
app.mount("/static", StaticFiles(directory="static"), name="static")

# ----------------- Run locally -----------------
if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=int(os.getenv("PORT", 8000)))
