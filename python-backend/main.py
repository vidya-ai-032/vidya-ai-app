# python-backend/main.py
import os
from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.responses import PlainTextResponse
from langchain_community.document_loaders import PyPDFLoader # LangChain's PDF loader
import tempfile
import shutil
from typing import List

# Initialize FastAPI app
# Make sure this line exists and is exactly 'app = FastAPI(...)'
app = FastAPI(
    title="Document Extraction Service",
    description="API for extracting text from documents using LangChain.",
    version="1.0.0"
)

# Root endpoint for health check
@app.get("/")
async def read_root():
    return {"message": "Document Extraction Service is running!"}

@app.post("/extract-pdf-text/", response_class=PlainTextResponse)
async def extract_pdf_text(file: UploadFile = File(...)):
    """
    Extracts text from an uploaded PDF file using LangChain's PyPDFLoader.
    """
    if file.content_type != "application/pdf":
        raise HTTPException(status_code=400, detail="Only PDF files are supported for extraction.")

    # Create a temporary file to save the uploaded PDF
    temp_dir = tempfile.mkdtemp()
    temp_file_path = os.path.join(temp_dir, file.filename)

    try:
        # Write the uploaded file content to the temporary file
        with open(temp_file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)

        # Use LangChain's PyPDFLoader to load the PDF
        # PyPDFLoader processes the file from its path
        loader = PyPDFLoader(temp_file_path)
        
        # Load the documents (each page as a separate document)
        documents = loader.load()

        # Concatenate text from all pages
        full_text = "\n".join([doc.page_content for doc in documents])

        return PlainTextResponse(content=full_text)
    except Exception as e:
        # Log the detailed error on the server side for debugging
        print(f"Error during PDF text extraction: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to extract text from PDF: {e}")
    finally:
        # Clean up the temporary directory after processing
        if os.path.exists(temp_dir):
            shutil.rmtree(temp_dir)
