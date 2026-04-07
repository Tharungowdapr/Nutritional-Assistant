"""
AaharAI NutriSync — RAG Ingestion Pipeline
Parses IFCT PDF + Excel data → chunks → embeds → stores in ChromaDB.
Run this once: python -m rag.ingest
"""
import logging
from pathlib import Path

import chromadb
import fitz  # PyMuPDF
import pandas as pd
from langchain.text_splitter import RecursiveCharacterTextSplitter

from config import settings

logger = logging.getLogger(__name__)


def extract_pdf_text(pdf_path: Path) -> list[dict]:
    """Extract text from IFCT PDF, page by page."""
    docs = []
    with fitz.open(str(pdf_path)) as pdf:
        for page_num in range(len(pdf)):
            page = pdf[page_num]
            text = page.get_text("text").strip()
            if len(text) > 50:  # skip nearly-empty pages
                docs.append({
                    "text": text,
                    "metadata": {
                        "source": "IFCT_2017_PDF",
                        "page_number": page_num + 1,
                        "type": "pdf_page",
                    },
                })
    logger.info(f"Extracted {len(docs)} pages from IFCT PDF")
    return docs


def excel_to_documents(excel_path: Path) -> list[dict]:
    """Convert each row of each Excel sheet into a text document."""
    docs = []
    sheet_configs = [
        ("Food Composition (IFCT 2017)", "Food Name", "food_db"),
        ("ICMR-NIN RDA Targets", "Profile", "rda"),
        ("Disease Nutrition Protocols", "Condition", "disease"),
        ("Medicine Nutrition Impacts", "Brand Name (India)", "medicine"),
        ("Regional Food Culture", "Zone", "regional"),
        ("Profession Calorie Guide", "Profession Category", "profession"),
        ("GLP-1 Nutrition Protocol", "Medication", "glp1"),
        ("Physio-State Nutrient Map", "Physiological State", "physio"),
        ("Life-Stage Nutrient Priorities", "Life Stage", "lifestage"),
        ("Micronutrient-Food Matrix", "Nutrient", "micronutrient"),
        ("Context Resolver Rules", "Conflict Scenario", "context_rules"),
        ("Indian Portion Conversions", "Portion Description", "portions"),
    ]

    for sheet_name, id_col, source_tag in sheet_configs:
        try:
            df = pd.read_excel(str(excel_path), sheet_name=sheet_name, header=1)
            df = df.dropna(subset=[id_col])

            for _, row in df.iterrows():
                # Serialize row to readable text
                parts = []
                for col in df.columns:
                    val = row[col]
                    if pd.notna(val) and str(val).strip():
                        parts.append(f"{col}: {val}")
                text = "\n".join(parts)

                # Build metadata
                metadata = {
                    "source": source_tag,
                    "sheet": sheet_name,
                    "type": "excel_row",
                    "identifier": str(row[id_col]),
                }
                # Add extra metadata for food rows
                if source_tag == "food_db":
                    if "Food Group" in row:
                        metadata["food_group"] = str(row.get("Food Group", ""))
                    if "Diet Type" in row:
                        metadata["diet_type"] = str(row.get("Diet Type", ""))

                docs.append({"text": text, "metadata": metadata})
        except Exception as e:
            logger.warning(f"Could not load sheet '{sheet_name}': {e}")

    logger.info(f"Created {len(docs)} documents from Excel sheets")
    return docs


def chunk_documents(docs: list[dict], chunk_size: int = 512,
                    chunk_overlap: int = 50) -> list[dict]:
    """Split documents into smaller chunks."""
    splitter = RecursiveCharacterTextSplitter(
        chunk_size=chunk_size,
        chunk_overlap=chunk_overlap,
        length_function=len,
        separators=["\n\n", "\n", ". ", " ", ""],
    )

    chunks = []
    for doc in docs:
        splits = splitter.split_text(doc["text"])
        for i, split in enumerate(splits):
            chunks.append({
                "text": split,
                "metadata": {**doc["metadata"], "chunk_index": i},
            })

    logger.info(f"Created {len(chunks)} chunks from {len(docs)} documents")
    return chunks


def ingest_to_chroma(chunks: list[dict], collection_name: str = "nutrisync"):
    """Embed chunks and store in ChromaDB."""
    # Create persistent ChromaDB client
    settings.CHROMA_DB_PATH.mkdir(parents=True, exist_ok=True)
    client = chromadb.PersistentClient(path=str(settings.CHROMA_DB_PATH))

    # Delete existing collection if exists
    try:
        client.delete_collection(collection_name)
    except Exception:
        pass

    collection = client.create_collection(
        name=collection_name,
        metadata={"hnsw:space": "cosine"},
    )

    # Batch insert (ChromaDB uses its default embedding model)
    batch_size = 100
    for i in range(0, len(chunks), batch_size):
        batch = chunks[i : i + batch_size]
        collection.add(
            ids=[f"chunk_{i + j}" for j in range(len(batch))],
            documents=[c["text"] for c in batch],
            metadatas=[c["metadata"] for c in batch],
        )
        logger.info(f"Inserted batch {i // batch_size + 1}/{(len(chunks) // batch_size) + 1}")

    logger.info(f"✅ Ingested {len(chunks)} chunks into ChromaDB collection '{collection_name}'")
    return collection


def run_ingestion():
    """Full ingestion pipeline: PDF + Excel → ChromaDB."""
    logging.basicConfig(level=logging.INFO)

    # 1. Extract documents
    pdf_docs = extract_pdf_text(settings.IFCT_PDF_PATH)
    excel_docs = excel_to_documents(settings.EXCEL_PATH)
    all_docs = pdf_docs + excel_docs

    # 2. Chunk
    chunks = chunk_documents(all_docs, settings.RAG_CHUNK_SIZE, settings.RAG_CHUNK_OVERLAP)

    # 3. Ingest into ChromaDB
    ingest_to_chroma(chunks)

    print(f"\n✅ Ingestion complete!")
    print(f"   PDF pages: {len(pdf_docs)}")
    print(f"   Excel rows: {len(excel_docs)}")
    print(f"   Total chunks: {len(chunks)}")


if __name__ == "__main__":
    run_ingestion()
