"""
AaharAI NutriSync — RAG Ingestion Pipeline
Parses IFCT PDF + Excel data → chunks → embeds → stores in ChromaDB.
Run this once: python -m rag.ingest
"""
import logging
import sys
from pathlib import Path

import chromadb
import fitz  # PyMuPDF
import pandas as pd
from langchain_text_splitters import RecursiveCharacterTextSplitter

# Add parent dir to path so config can be imported
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
from config import settings

logging.basicConfig(level=logging.INFO, format="%(asctime)s — %(message)s")
logger = logging.getLogger(__name__)


def extract_pdf_text(pdf_path: Path) -> list[dict]:
    """Extract text from IFCT PDF, page by page."""
    docs = []
    logger.info(f"📄 Opening PDF: {pdf_path.name} ({pdf_path.stat().st_size / 1e6:.1f} MB)")
    with fitz.open(str(pdf_path)) as pdf:
        total = len(pdf)
        for page_num in range(total):
            page = pdf[page_num]
            text = page.get_text("text").strip()
            if len(text) > 50:
                docs.append({
                    "text": text,
                    "metadata": {
                        "source": "IFCT_2017_PDF",
                        "page_number": str(page_num + 1),
                        "type": "pdf_page",
                    },
                })
            if (page_num + 1) % 50 == 0:
                logger.info(f"   Extracted {page_num + 1}/{total} pages...")
    logger.info(f"✅ Extracted {len(docs)} pages from IFCT PDF")
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
                parts = []
                for col in df.columns:
                    val = row[col]
                    if pd.notna(val) and str(val).strip():
                        parts.append(f"{col}: {val}")
                text = "\n".join(parts)

                metadata = {
                    "source": source_tag,
                    "sheet": sheet_name,
                    "type": "excel_row",
                    "identifier": str(row[id_col]),
                }
                if source_tag == "food_db":
                    if "Food Group" in row and pd.notna(row.get("Food Group")):
                        metadata["food_group"] = str(row["Food Group"])
                    if "Diet Type" in row and pd.notna(row.get("Diet Type")):
                        metadata["diet_type"] = str(row["Diet Type"])

                docs.append({"text": text, "metadata": metadata})

            logger.info(f"   📊 {sheet_name}: {len(df)} rows")
        except Exception as e:
            logger.warning(f"   ⚠️ Could not load sheet '{sheet_name}': {e}")

    logger.info(f"✅ Created {len(docs)} documents from Excel sheets")
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
                "metadata": {**doc["metadata"], "chunk_index": str(i)},
            })

    logger.info(f"✅ Created {len(chunks)} chunks from {len(docs)} documents")
    return chunks


def ingest_to_chroma(chunks: list[dict], collection_name: str = "nutrisync"):
    """Embed chunks and store in ChromaDB using default embeddings."""
    chroma_path = settings.CHROMA_DB_PATH
    chroma_path.mkdir(parents=True, exist_ok=True)
    client = chromadb.PersistentClient(path=str(chroma_path))

    # Delete existing collection if exists
    try:
        client.delete_collection(collection_name)
        logger.info("🗑️ Deleted existing collection")
    except Exception:
        pass

    # Create collection with default embedding function (all-MiniLM-L6-v2)
    collection = client.create_collection(
        name=collection_name,
        metadata={"hnsw:space": "cosine"},
    )

    # Batch insert
    batch_size = 100
    total_batches = (len(chunks) // batch_size) + 1
    for i in range(0, len(chunks), batch_size):
        batch = chunks[i: i + batch_size]

        # Ensure all metadata values are strings (ChromaDB requirement)
        clean_metadatas = []
        for c in batch:
            clean_meta = {}
            for k, v in c["metadata"].items():
                clean_meta[k] = str(v) if v is not None else ""
            clean_metadatas.append(clean_meta)

        collection.add(
            ids=[f"chunk_{i + j}" for j in range(len(batch))],
            documents=[c["text"] for c in batch],
            metadatas=clean_metadatas,
        )
        batch_num = (i // batch_size) + 1
        if batch_num % 5 == 0 or batch_num == total_batches:
            logger.info(f"   Inserted batch {batch_num}/{total_batches}")

    logger.info(f"✅ Ingested {len(chunks)} chunks into ChromaDB collection '{collection_name}'")
    return collection


def run_ingestion():
    """Full ingestion pipeline: PDF + Excel → ChromaDB."""
    logger.info("=" * 60)
    logger.info("🚀 AaharAI NutriSync — RAG Ingestion Pipeline")
    logger.info("=" * 60)

    # 1. Extract documents
    logger.info("\n📄 Step 1: Extracting PDF text...")
    pdf_docs = extract_pdf_text(settings.IFCT_PDF_PATH)

    logger.info("\n📊 Step 2: Converting Excel sheets...")
    excel_docs = excel_to_documents(settings.EXCEL_PATH)
    all_docs = pdf_docs + excel_docs

    # 2. Chunk
    logger.info("\n✂️ Step 3: Chunking documents...")
    chunks = chunk_documents(all_docs, settings.RAG_CHUNK_SIZE, settings.RAG_CHUNK_OVERLAP)

    # 3. Ingest into ChromaDB
    logger.info("\n💾 Step 4: Ingesting into ChromaDB...")
    ingest_to_chroma(chunks)

    logger.info("\n" + "=" * 60)
    logger.info(f"✅ Ingestion complete!")
    logger.info(f"   PDF pages: {len(pdf_docs)}")
    logger.info(f"   Excel rows: {len(excel_docs)}")
    logger.info(f"   Total chunks: {len(chunks)}")
    logger.info(f"   ChromaDB path: {settings.CHROMA_DB_PATH}")
    logger.info("=" * 60)


if __name__ == "__main__":
    run_ingestion()
