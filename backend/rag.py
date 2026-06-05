import os
import chromadb
from langchain_chroma import Chroma
from dotenv import load_dotenv
from langchain_huggingface import HuggingFaceEmbeddings
from langchain_groq import ChatGroq
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.output_parsers import StrOutputParser

load_dotenv()

CHROMA_PATH = ".chroma"
EMBEDDING_MODEL = "all-MiniLM-L6-v2"

PROMPT_TEMPLATE = """
You are an expert analyst on the Indian job market. Use ONLY the context below to answer the question.
If the context doesn't contain enough information, say "I don't have enough data to answer that."

Context:
{context}

Question: {question}

Answer:"""



def get_retriever(k: int = 5):
    embeddings = HuggingFaceEmbeddings(model_name=EMBEDDING_MODEL)

    
    client = chromadb.PersistentClient(path=CHROMA_PATH)

   
    db = Chroma(
        client=client,
        collection_name="langchain",
        embedding_function=embeddings,
    )
    return db.as_retriever(search_kwargs={"k": k})

def format_docs(docs):
    return "\n\n---\n\n".join(doc.page_content for doc in docs)


def query_rag(question:str) -> dict:
    retriever = get_retriever(k=3)


    docs = retriever.invoke(question)
    context = format_docs(docs)

    prompt = ChatPromptTemplate.from_template(PROMPT_TEMPLATE)
    llm = ChatGroq(model = 'llama-3.1-8b-instant', temperature = 0)

    chain = prompt | llm | StrOutputParser()

    answer = chain.invoke({"context": context, "question": question})

    sources = []
    for doc in docs:
        meta = doc.metadata
        title = meta.get("job_title", "")
        company = meta.get("company", "")
        location = meta.get("location", "")
        if title and company:
            label = f"{title} @ {company}"
            if location:
                label += f" ({location})"
            sources.append(label)
    sources = list(set(sources)) if sources else ["Data Jobs Dataset"]

    return {
        "question": question,
        "answer": answer,
        "sources": sources
    }

if __name__ == "__main__":
    test_questions = [
        "What are the top skills required for data science jobs in India?",
        "Which cities have the most ML job openings?",
        "What is the average salary for a Python developer in India?",
    ]

    for q in test_questions:
        print(f"\n{'='*60}")
        print(f"Q: {q}")
        result = query_rag(q)
        print(f"A: {result['answer']}")
        print(f"Sources: {result['sources']}")



