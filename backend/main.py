import os
import json
import sqlite3
from datetime import datetime
from typing import Optional

from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pypdf import PdfReader
from openai import OpenAI
from dotenv import load_dotenv

load_dotenv()

DB_PATH = os.environ.get("DB_PATH", "backend/db.sqlite3")
OPENAI_API_KEY = os.environ.get("OPENAI_API_KEY")
MODEL = os.environ.get("OPENAI_MODEL", "gpt-4o-mini")

app = FastAPI(title="LLM Document Analyzer")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


def get_conn():
    os.makedirs(os.path.dirname(DB_PATH), exist_ok=True)
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def init_db():
    conn = get_conn()
    cur = conn.cursor()
    cur.execute(
        """
        CREATE TABLE IF NOT EXISTS documents (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            filename TEXT NOT NULL,
            text TEXT NOT NULL,
            created_at TEXT NOT NULL
        );
        """
    )
    cur.execute(
        """
        CREATE TABLE IF NOT EXISTS analysis_results (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            doc_id INTEGER NOT NULL,
            result_json TEXT NOT NULL,
            created_at TEXT NOT NULL,
            FOREIGN KEY (doc_id) REFERENCES documents(id)
        );
        """
    )
    conn.commit()
    conn.close()


init_db()


@app.get("/")
def health():
    return {"status": "ok"}


@app.post("/upload")
async def upload_pdf(file: UploadFile = File(...)):
    if not file.filename.lower().endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Only PDF files are supported")

    try:
        reader = PdfReader(file.file)
        text_chunks = []
        for page in reader.pages:
            text_chunks.append(page.extract_text() or "")
        extracted_text = "\n".join(text_chunks).strip()
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to extract PDF text: {e}")

    if not extracted_text:
        raise HTTPException(status_code=400, detail="No text could be extracted from the PDF")

    now = datetime.utcnow().isoformat()
    conn = get_conn()
    cur = conn.cursor()
    cur.execute(
        "INSERT INTO documents(filename, text, created_at) VALUES (?, ?, ?)",
        (file.filename, extracted_text, now),
    )
    doc_id = cur.lastrowid
    conn.commit()
    conn.close()

    return {"doc_id": doc_id, "filename": file.filename, "text": extracted_text}


SCHEMA_INSTRUCTIONS = (
    "You are a careful document analysis assistant. Return STRICT JSON only. No prose.\n"
    "Tasks: (1) classify doc as contract, invoice, or report (2) find missing/partial required fields (3) recommend improvements.\n"
    "Required fields by type: \n"
    "- contract: party_1, party_2, signature, date, payment_terms\n"
    "- invoice: invoice_number, amount, due_date, tax, bill_to, bill_from\n"
    "Rules: \n"
    "- type is one of: contract | invoice | report\n"
    "- confidence: float between 0 and 1\n"
    "- missing_fields: only include fields that are missing or partially present. For each: {name, status: 'missing'|'partial', details}\n"
    "- recommendations: array of {text, priority: 'critical'|'optional', related_field}\n"
    "Return JSON object with keys: type, confidence, missing_fields, recommendations."
)


def build_prompt(text: str) -> str:
    return (
        f"{SCHEMA_INSTRUCTIONS}\n\nDocument Text:\n" + text[:15000]
    )


def call_openai(prompt: str) -> str:
    if not OPENAI_API_KEY:
        raise HTTPException(status_code=500, detail="OPENAI_API_KEY not configured")

    client = OpenAI(api_key=OPENAI_API_KEY)
    resp = client.chat.completions.create(
        model=MODEL,
        temperature=0,
        messages=[
            {"role": "system", "content": "Return ONLY valid JSON that matches the specified schema."},
            {"role": "user", "content": prompt},
        ],
    )
    return resp.choices[0].message.content or ""


@app.post("/analyze/{doc_id}")
async def analyze(doc_id: int):
    conn = get_conn()
    cur = conn.cursor()
    row = cur.execute("SELECT id, text FROM documents WHERE id = ?", (doc_id,)).fetchone()
    if not row:
        conn.close()
        raise HTTPException(status_code=404, detail="Document not found")

    text = row["text"]
    prompt = build_prompt(text)

    # Attempt 1
    content = call_openai(prompt)

    def parse_json(s: str) -> Optional[dict]:
        try:
            # strip code fences if present
            if s.strip().startswith("```"):
                s = s.strip().strip("`")
                if s.startswith("json"):
                    s = s[4:]
            return json.loads(s)
        except Exception:
            return None

    data = parse_json(content)

    # Retry once if parsing failed
    if data is None:
        retry_prompt = prompt + "\n\nReturn ONLY minified JSON."
        content = call_openai(retry_prompt)
        data = parse_json(content)

    if data is None:
        raise HTTPException(status_code=502, detail="Model returned unparseable JSON")

    # Basic normalization
    allowed_types = {"contract", "invoice", "report"}
    if data.get("type") not in allowed_types:
        # heuristic: try to infer
        data["type"] = "report"
    try:
        conf = float(data.get("confidence", 0))
        data["confidence"] = max(0.0, min(1.0, conf))
    except Exception:
        data["confidence"] = 0.0

    now = datetime.utcnow().isoformat()
    cur.execute(
        "INSERT INTO analysis_results(doc_id, result_json, created_at) VALUES (?, ?, ?)",
        (doc_id, json.dumps(data), now),
    )
    conn.commit()
    conn.close()

    return data