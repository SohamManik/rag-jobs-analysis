import os
import json
import chromadb
from langchain_chroma import Chroma
from dotenv import load_dotenv
from langchain_nvidia_ai_endpoints import ChatNVIDIA, NVIDIAEmbeddings
from langchain_core.prompts import ChatPromptTemplate, MessagesPlaceholder
from langchain_core.runnables.history import RunnableWithMessageHistory
from langchain_core.chat_history import BaseChatMessageHistory
from langchain_community.chat_message_histories import ChatMessageHistory
from langchain_classic.chains import create_history_aware_retriever, create_retrieval_chain
from langchain_classic.chains.combine_documents import create_stuff_documents_chain

load_dotenv()

CHROMA_PATH = ".chroma"

# 1. Setup Embeddings and Retriever
embeddings = NVIDIAEmbeddings(model="nvidia/nv-embedqa-e5-v5")
client = chromadb.PersistentClient(path=CHROMA_PATH)
db = Chroma(
    client=client,
    collection_name="langchain",
    embedding_function=embeddings,
)
retriever = db.as_retriever(search_kwargs={"k": 15})

# 2. Setup LLM
llm = ChatNVIDIA(model='meta/llama-3.1-70b-instruct', temperature=0)

# 3. Conversational Prompts
contextualize_q_system_prompt = (
    "Given a chat history and the latest user question "
    "which might reference context in the chat history, "
    "formulate a standalone question which can be understood "
    "without the chat history. Do NOT answer the question, "
    "just reformulate it if needed and otherwise return it as is."
)
contextualize_q_prompt = ChatPromptTemplate.from_messages([
    ("system", contextualize_q_system_prompt),
    MessagesPlaceholder("chat_history"),
    ("human", "{input}"),
])

system_prompt = (
    "You are an expert analyst on the Indian job market. "
    "Use ONLY the context below to answer the question. "
    "If asked for an average, trend, or aggregate statistic, calculate it based on the provided sample context and state that it is an estimate based on retrieved data. "
    "If the context is completely unrelated to the question, say 'I don't have enough data to answer that.'\n"
    "When stating facts or statistics, you MUST include inline citations in the format [1], [2], etc., mapping to the provided context documents.\n\n"
    "Context:\n{context}"
)
qa_prompt = ChatPromptTemplate.from_messages([
    ("system", system_prompt),
    MessagesPlaceholder("chat_history"),
    ("human", "{input}"),
])

# 4. Memory Store
store = {}

def get_session_history(session_id: str) -> BaseChatMessageHistory:
    if session_id not in store:
        store[session_id] = ChatMessageHistory()
    return store[session_id]

def get_conversational_rag_chain():
    history_aware_retriever = create_history_aware_retriever(llm, retriever, contextualize_q_prompt)
    question_answer_chain = create_stuff_documents_chain(llm, qa_prompt)
    rag_chain = create_retrieval_chain(history_aware_retriever, question_answer_chain)
    
    conversational_rag_chain = RunnableWithMessageHistory(
        rag_chain,
        get_session_history,
        input_messages_key="input",
        history_messages_key="chat_history",
        output_messages_key="answer",
    )
    return conversational_rag_chain

def extract_sources(docs):
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
    return list(set(sources)) if sources else ["Data Jobs Dataset"]

def query_rag_stream(question: str, session_id: str = "default"):
    chain = get_conversational_rag_chain()
    docs = []
    
    for chunk in chain.stream({"input": question}, config={"configurable": {"session_id": session_id}}):
        if "context" in chunk:
            docs = chunk["context"]
        if "answer" in chunk:
            text_chunk = chunk["answer"]
            yield text_chunk
            
    sources = extract_sources(docs)
    yield f"\n\n__SOURCES__:{json.dumps(sources)}"

def query_rag(question: str, session_id: str = "default") -> dict:
    chain = get_conversational_rag_chain()
    result = chain.invoke({"input": question}, config={"configurable": {"session_id": session_id}})
    
    return {
        "question": question,
        "answer": result["answer"],
        "sources": extract_sources(result.get("context", []))
    }
