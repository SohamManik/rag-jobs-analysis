from datasets import load_dataset
import config
from db import sessionlocal , Job , init_db
from langchain_huggingface import HuggingFaceEmbeddings
from langchain_chroma import Chroma
from langchain_core.documents import Document
 
LIMIT = 10000

def load_to_postgress(limit = LIMIT):
    ds = load_dataset('lukebarousse/data_jobs', split = "train")
    session = sessionlocal()

    data = []
    for row in ds:
        if row.get("job_country") == "India":
            data.append(row)
            if limit and len(data) >= limit:
                break

    print(f"Loading the dataset of {len(data)} Length into POSTGRE SQl")


    for i , row in enumerate(data):
        job = Job(
            job_title = row.get("job_title"),
            job_title_short = row.get("job_title_short"),
            company_name = row.get("company_name"),
            job_location =row.get("job_location"),
            job_country = row.get("job_country"),
            job_schedule_type = row.get("job_schedule_type"),
            job_work_from_home = bool(row.get("job_work_from_home")),
            salary_year_avg = row.get("salary_year_avg"),
            salary_hour_avg = row.get("salary_hour_avg"),
            job_skills = str(row.get("job_skills") if row.get("job_skills") else None),
            job_posted_date = row.get("job_posted_date"),
        )

        if i % 500 == 0 and i > 0 :
            session.commit()
            print(f"This committed {i} records")
    
    session.commit()
    session.close()
    print("Postgre sql is done")



def load_to_chromadb(limit = LIMIT):
    ds = load_dataset("lukebarousse/data_jobs" , split = "train")

    data = []
    for row in ds:
        if row.get("job_country") == "India":
            data.append(row)
            if limit and len(data) >= limit:
                break

    print(f"Embedding documents{len(data)} into Chroma Db")

    embedding = HuggingFaceEmbeddings(model_name="all-MiniLM-L6-v2")

    documents = []

    for row in data :
        content = (
            f"Job Title: {row.get('job_title', '')}\n"
            f"Company: {row.get('company_name', '')}\n"
            f"Location: {row.get('job_location', '')}\n"
            f"Country: {row.get('job_country', '')}\n"
            f"Work From Home: {row.get('job_work_from_home', '')}\n"
            f"Salary (Yearly): {row.get('salary_year_avg', 'N/A')}\n"
            f"Skills: {row.get('job_skills', '')}\n"
        )

        documents.append( Document(
            page_content = content, 
            metadata={
                "job_title": str(row.get("job_title", "")),
                "company"  : str(row.get("company_name", "")),
                "location" : str(row.get("job_location", "")),
                "country"  : str(row.get("job_country", "")),
            }

        ) )

    batch_size = 500 
    vectorstore = None 

    for i in range(0 , len(documents) , batch_size):
        batch = documents[i:i+batch_size]

        if vectorstore is None:
            vectorstore= Chroma.from_documents(
                documents = batch,
                embedding = embedding,
                persist_directory = ".chroma",
            )
        else:
            vectorstore.add_documents(batch)

            print(f"Embedded {min(i + batch_size  , len(documents))}/{len(documents)}")
        print("Chromadb is done")

if __name__ == "__main__":
    init_db()
    load_to_postgress()
    load_to_chromadb()