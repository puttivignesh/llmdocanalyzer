# LLM Document Analyzer

A full-stack document analysis app with:
- Frontend: Next.js 15 + Tailwind CSS + shadcn/ui
- Backend: FastAPI + SQLite + OpenAI (gpt-4o-mini / gpt-4)

Features:
- PDF upload with text extraction (pypdf)
- Store documents and analysis results in SQLite
- LLM classification (contract, invoice, report) with confidence
- Missing fields detection per type
- Actionable recommendations (critical vs optional)

---

## Project Structure

- frontend/ → This repo (Next.js app under `src/`)
- backend/ → FastAPI server (`backend/main.py`)
- README.md → This file
- .env.example → Environment template

The frontend is already set up in the `src/` directory of this repository. The backend lives in the `backend/` directory.

---

## Prerequisites

- Node.js 18+
- Python 3.10+

---

## Environment Variables

Copy the example env file and fill in your keys:

```
cp .env.example .env
```

Required:
- OPENAI_API_KEY: your OpenAI API key

Optional:
- OPENAI_MODEL: defaults to `gpt-4o-mini` (you can use `gpt-4` if allowed)
- DB_PATH: defaults to `backend/db.sqlite3`

Frontend configuration (optional):
- NEXT_PUBLIC_API_BASE: set to the backend URL (default used by UI: `http://localhost:8000`)

Create a `.env.local` for the frontend if you want to override defaults:

```
# .env.local
NEXT_PUBLIC_API_BASE=http://localhost:8000
```

---

## Backend Setup (FastAPI)

Create and activate a virtual environment, then install dependencies:

```
cd backend
python -m venv .venv
source .venv/bin/activate  # Windows: .venv\Scripts\activate
pip install -r requirements.txt
```

Run the FastAPI server:

```
# from the backend directory (with the venv activated)
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

This will:
- Initialize the SQLite database (`backend/db.sqlite3` by default)
- Expose the API at http://localhost:8000
- Enable CORS for the frontend

Health check:
- GET / → `{ "status": "ok" }`

Endpoints:
- POST /upload → accepts `multipart/form-data` with field `file` (PDF)
- POST /analyze/{doc_id} → analyze the uploaded document with OpenAI and persist results

---

## Frontend Setup (Next.js)

Install dependencies and start the dev server:

```
# at the repo root
npm install
npm run dev
```

By default, the frontend will call the backend at `http://localhost:8000`. If you host the backend elsewhere, set `NEXT_PUBLIC_API_BASE` accordingly.

Main UI file:
- `src/app/page.tsx` renders the PDF upload form, extracted text preview, classification, missing fields table, and recommendations checklist.

Tailwind & shadcn/ui are preconfigured (see `src/app/globals.css` and components under `src/components/ui`).

---

## API Usage Examples

Upload a PDF:

```
curl -X POST \
  -F "file=@/path/to/your.pdf" \
  http://localhost:8000/upload
```

Example response:
```
{
  "doc_id": 1,
  "filename": "your.pdf",
  "text": "...extracted text..."
}
```

Analyze a document:

```
curl -X POST http://localhost:8000/analyze/1
```

Example response:
```
{
  "type": "contract",
  "confidence": 0.97,
  "missing_fields": [],
  "recommendations": []
}
```

---

## How It Works

1) Upload & Extraction
- Frontend sends the PDF to `POST /upload`.
- Backend extracts text using `pypdf.PdfReader` and stores `filename`, `text` in `documents` table.

2) LLM Analysis
- Frontend calls `POST /analyze/{doc_id}`.
- Backend builds a strict JSON prompt and calls OpenAI with temperature=0.
- The model returns: `type` (contract|invoice|report), `confidence`, `missing_fields[]`, and `recommendations[]`.
- Result JSON is normalized and stored in `analysis_results` table.
- Includes a single retry if JSON parsing fails.

3) Frontend Display
- Shows extracted text, classification, missing fields (table), and recommendations (checklist with priority badges).

Database schema:
- documents(id INTEGER PK, filename TEXT, text TEXT, created_at TEXT)
- analysis_results(id INTEGER PK, doc_id INTEGER, result_json TEXT, created_at TEXT)

---

## Success Criteria (Manual QA)

- Contract doc: upload a complete contract → expect `type=contract`, high confidence, no missing fields.
- Invoice doc: upload an incomplete invoice (omit due date/tax) → expect `type=invoice`, missing fields includes `due_date` and `tax` with `missing` or `partial` status.
- Frontend clearly displays the extracted text, classification + confidence, missing fields table, and recommendations.

---

## Troubleshooting

- 400 on /upload: Ensure the file is a PDF and has extractable text.
- 502 on /analyze: Usually invalid or unparsable model output. Check `OPENAI_API_KEY` and model access.
- CORS issues: Confirm the backend runs at `http://localhost:8000` and the frontend `NEXT_PUBLIC_API_BASE` matches.
- Empty text: Some PDFs are scanned images; consider OCR if needed (not included).

---

## Security Note

This sample enables CORS for all origins for ease of local development. Restrict origins before deploying to production.

---

## License

MIT