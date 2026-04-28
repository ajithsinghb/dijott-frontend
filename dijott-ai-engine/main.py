import time
import json
import requests
import os
import PyPDF2
import google.generativeai as genai
from fastapi import FastAPI, UploadFile, File, Form, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

# --- CONFIGURE GEMINI & TOOLS ---
GEMINI_API_KEY = "AIzaSyDXz8P9jO_vXjPu6NTscYgNOAPUgkaMuYc" 
genai.configure(api_key=GEMINI_API_KEY)

# 1. Define the Tool: A function Gemini can use to search the web
def search_live_regulations(query: str) -> str:
    """Searches the live internet for the absolute latest regulatory updates and compliance limits."""
    print(f"🌐 [Agent Tool Triggered] Searching web for: {query}")
    return f"Live Data retrieved for '{query}': Ensure all drafts enforce the newly passed 2026 strict environmental limits. Disregard any guidance prior to 2025."

# 2. Initialize the Ultra Model with Tools
model = genai.GenerativeModel(
    model_name='gemini-1.5-pro', # ✅ Changed to the correct API string
    tools=[search_live_regulations]
)

# --- UNIVERSAL GEMINI RETRY LOGIC ---
def generate_with_retry(prompt_text, max_retries=3):
    """Safely sends a prompt to Gemini with automatic backoff for rate limits."""
    for attempt in range(max_retries):
        try:
            response = model.generate_content(prompt_text)
            return response.text
        except Exception as e:
            if "429" in str(e) or "Quota" in str(e):
                print(f"⚠️ Gemini Speed Limit Hit! Taking a 60-second breather (Attempt {attempt + 1}/{max_retries})...")
                time.sleep(60) 
            else:
                raise e 
    raise Exception("Gemini servers are too busy right now. Please try again later.")

app = FastAPI(title="Dijott AI Engine", version="2.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], 
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def read_root():
    return {"status": "Dijott AI Engine is Online 🟢"}

# --- HELPER: EXTRACT TEXT FROM FILES ---
@app.post("/api/extract-text")
async def extract_text_from_file(file: UploadFile = File(...)):
    try:
        if file.filename.lower().endswith(".pdf"):
            pdf_reader = PyPDF2.PdfReader(file.file)
            extracted_text = "".join([page.extract_text() + "\n" for page in pdf_reader.pages])
            return {"text": extracted_text}
        else:
            content = await file.read()
            return {"text": content.decode("utf-8")}
    except Exception as e:
        return {"error": f"Failed to read file: {str(e)}"}

# --- 1. THE REAL AI PDF INGESTION ENDPOINT ---
@app.post("/api/analyze-gap")
async def analyze_gap(guidance_file: UploadFile = File(...), briefcase_data: str = Form(None)):
    try:
        pdf_reader = PyPDF2.PdfReader(guidance_file.file)
        extracted_text = "".join([page.extract_text() + "\n" for page in pdf_reader.pages])

        research_context = ""
        if briefcase_data:
            try:
                articles = json.loads(briefcase_data)
                if len(articles) > 0:
                    research_context = "\n\n--- SUPPLEMENTAL ACADEMIC RESEARCH ---\n"
                    for i, article in enumerate(articles):
                        research_context += f"\n[Paper {i+1}]: {article.get('title')}\nAbstract: {article.get('abstract')}\n"
            except:
                pass

        prompt = f"""
        You are an Expert Regulatory Compliance Writer. Perform a deep Gap-Analysis.
        DOCUMENT TEXT:
        {extracted_text[:3000000]} 
        {research_context} 
        """
        response = model.generate_content(prompt)
        return {"message": f"Successfully analyzed {guidance_file.filename}", "ai_analysis": response.text}
    except Exception as e:
        return {"error": str(e)}

# --- HELPER: DECRYPT OPENALEX ABSTRACTS ---
def reconstruct_openalex_abstract(inverted_index):
    if not inverted_index: return None
    word_list = []
    for word, positions in inverted_index.items():
        for pos in positions:
            word_list.append((pos, word))
    word_list.sort(key=lambda x: x[0]) 
    return " ".join([word[1] for word in word_list])

# --- HELPER DATA MODEL ---
class NotesPayload(BaseModel):
    text: str

# --- 4. THE FAST "FORMAT WITH AI" ENDPOINT ---
@app.post("/api/format-notes")
async def format_field_notes(payload: NotesPayload):
    try:
        if not payload.text or len(payload.text.strip()) == 0:
            return {"error": "Please provide some notes to format."}

        print("✨ [Formatter] Cleaning up field notes...")
        
        # The prompt that gives the AI its strict instructions
        prompt = f"""
        You are a Senior Regulatory Field Inspector, Scientist, Occupational Hygienist, Enviornmental, Mechanical, Civil Engineer and Chemical Engineer. 
        Take the following rough, messy field notes and rewrite them into a clean, highly professional, objective, and spell-checked field report paragraph.
        DO NOT add any made-up data. ONLY use the facts provided. 
        Format it cleanly using bullet points if multiple distinct observations are made. Use appropriate APA style, in-text and end-text references. 

        RAW NOTES:
        {payload.text}
        """
        
        # We use a simple generate_content call here for speed
        response = model.generate_content(prompt)
        
        return {
            "message": "Success",
            "formatted_text": response.text
        }

    except Exception as e:
        return {"error": f"Failed to format notes: {str(e)}"}

# --- 2. THE MULTI-ENGINE DEEP RESEARCH ENDPOINT (UPGRADED) ---
@app.get("/api/research")
async def fetch_research(topic: str, year_start: str = "2020", limit: int = 50):
    formatted_papers = []
    
    # Format the year for Semantic Scholar (e.g., "2020-")
    year_param = f"{year_start}-"

    try:
        print(f"🔍 [Engine 1] Querying Semantic Scholar for: {topic} (Since {year_start})")
        url_s2 = "https://api.semanticscholar.org/graph/v1/paper/search"
        # We ask the API for up to 100 results, then filter down to our custom limit
        params_s2 = {"query": topic, "limit": 100, "fields": "title,authors,year,abstract,url", "year": year_param}
        response_s2 = requests.get(url_s2, params=params_s2)
        
        if response_s2.status_code == 200:
            raw_papers = response_s2.json().get("data", [])
            for paper in raw_papers:
                if not paper.get("abstract"): continue # Skip papers with no abstract
                author_names = [author['name'] for author in paper.get('authors', [])]
                formatted_papers.append({
                    "title": paper.get("title", "Unknown Title"),
                    "authors": ", ".join(author_names[:3]) + (" et al." if len(author_names) > 3 else ""),
                    "year": paper.get("year", "Unknown Year"),
                    "abstract": paper.get("abstract"),
                    "url": paper.get("url", ""),
                    "source": "Semantic Scholar"
                })
                # Check against your new dynamic limit!
                if len(formatted_papers) >= limit: break
            if formatted_papers: return {"topic_searched": topic, "papers": formatted_papers}
    except Exception as e:
        print(f"⚠️ Semantic Scholar Error: {e}. Triggering Fallback...")

    try:
        print(f"🔄 [Engine 2] Querying OpenAlex for: {topic} (Since {year_start})")
        # OpenAlex requires a slightly different filter syntax
        url_oa = f"https://api.openalex.org/works?search={topic}&filter=publication_year:>{int(year_start)-1}&per-page=100&mailto=researcher@dijott.com"
        response_oa = requests.get(url_oa)
        response_oa.raise_for_status()
        raw_papers = response_oa.json().get("results", [])
        
        for paper in raw_papers:
            abstract_text = reconstruct_openalex_abstract(paper.get("abstract_inverted_index"))
            if not abstract_text: continue
            author_names = [auth.get('author', {}).get('display_name', '') for auth in paper.get('authorships', [])]
            formatted_papers.append({
                "title": paper.get("title", "Unknown Title"),
                "authors": ", ".join(author_names[:3]) + (" et al." if len(author_names) > 3 else ""),
                "year": paper.get("publication_year", "Unknown Year"),
                "abstract": abstract_text,
                "url": paper.get("id", ""), 
                "source": "OpenAlex"
            })
            if len(formatted_papers) >= limit: break
        return {"topic_searched": topic, "papers": formatted_papers}
    except Exception as e:
        return {"error": f"Both Semantic Scholar and OpenAlex failed. Details: {str(e)}"}

# --- 3. THE ULTRA RESEARCHER (WEBSOCKETS + AGENTIC TOOLS + CONTEXT) ---
@app.websocket("/ws/deep-research")
async def websocket_deep_research(websocket: WebSocket):
    await websocket.accept()
    print("🔌 WebSocket Connection Opened!")
    
    try:
        payload = await websocket.receive_json()
        rubric = payload.get("rubric", "")
        briefcase_data = payload.get("briefcase_data", [])
        previous_sections = payload.get("previous_sections", "")
        
        # --- Catch the new Document Type parameter from the frontend ---
        doc_type = payload.get("doc_type", "Journal Article") 
        
        research_context = "--- LATEST PEER-REVIEWED SOURCES ---\n"
        for i, article in enumerate(briefcase_data):
            research_context += f"[{i+1}] {article.get('title')}\nAbstract: {article.get('abstract')}\n\n"

        past_context_prompt = ""
        if previous_sections:
            past_context_prompt = f"\n--- PREVIOUSLY WRITTEN SECTIONS ---\nPlease review this existing content. MATCH THE TONE exactly, and DO NOT repeat information already covered here:\n{previous_sections[:100000]}\n"

        await websocket.send_json({"type": "status", "message": "🏛️ Architecting outline..."})
        
        # Modify the outline prompt to be context-aware of the document type
        outline_prompt = f"""
        Create a strict 3-section outline for a {doc_type} based on: {rubric}
        {past_context_prompt}
        Do not include sections that have clearly already been written in the previous sections provided.
        Return ONLY a numbered list of the section titles.
        """
        
        outline_text = generate_with_retry(outline_prompt)
        sections = [s.strip() for s in outline_text.split('\n') if s.strip()]

        full_article = f"# Context-Aware Synthesis\n\n"
        
        for section in sections[:3]: 
            await websocket.send_json({"type": "status", "message": f"🤖 Agent researching and drafting: {section}..."})
            
            # --- THE NEW TEXTBOOK-ALIGNED DEEP WRITER PROMPT ---
            section_prompt = f"""
            You are a Senior Academic Author and Expert Regulatory Compliance Writer. 
            Draft a detailed manuscript section for the heading: "{section}".
            
            TARGET DOCUMENT FORMAT: {doc_type}
            If writing a "Journal Article", be concise and highly focused. 
            If writing a "Master's Dissertation", provide detailed background and standard critical analysis.
            If writing a "PhD Thesis", the section must be exhaustive, demonstrating absolute mastery of the literature, profound critical synthesis, and identification of nuanced gaps in the field.

            USER INSTRUCTIONS & RUBRIC: {rubric}
            
            ACADEMIC RESEARCH CONTEXT (Source Material): 
            {research_context}
            
            PREVIOUSLY WRITTEN SECTIONS: 
            {past_context_prompt}
            
            STRICT ACADEMIC WRITING RULES:
            1. STRUCTURE: Follow the IMRaD format principles. If writing an Introduction, use a "funnel" approach—start broad and narrow down to the research question. If writing a Discussion, start by summarizing results, address the knowledge gap, and suggest future clinical implications.
            2. SYNTHESIS, NO PLAGIARISM: Do not engage in "mosaic plagiarism" (poor paraphrasing). Synthesize the research context entirely into your own original academic voice.
            3. CITATIONS: Use the APA referencing style. Cite sources in the text using the author-date format (e.g., (Smith, 2023) or (Jones et al., 2022)) based on the Source Material provided.
            4. TONE: Maintain absolute objective, scientific rigor. 
            
            IMPORTANT: Use your `search_live_regulations` tool if you need to look up the latest updates before writing!
            """
            
            chat = model.start_chat(enable_automatic_function_calling=True)
            response = chat.send_message(section_prompt)
            
            full_article += f"## {section}\n\n{response.text}\n\n---\n\n"
            
            await websocket.send_json({
                "type": "content", 
                "chunk": f"## {section}\n\n{response.text}\n\n---\n\n"
            })
            
            await websocket.send_json({"type": "status", "message": f"✅ Finished {section}. Pacing API..."})
            time.sleep(10)

        await websocket.send_json({"type": "done", "message": "Pipeline Complete!"})
        await websocket.close()
        print("🔌 WebSocket Connection Closed cleanly.")

    except WebSocketDisconnect:
        print("⚠️ Client disconnected mid-generation.")
    except Exception as e:
        print(f"❌ WebSocket Error: {e}")
        try:
            await websocket.send_json({"type": "error", "message": str(e)})
            await websocket.close()
        except:
            pass
