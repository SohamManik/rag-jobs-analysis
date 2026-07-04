from dotenv import load_dotenv
import os

load_dotenv(dotenv_path=os.path.join(os.path.dirname(__file__), '..', '.env'))


DATABASE_URL = os.getenv("DATABASE_URL")
GROQ_API_KEY = os.getenv("GROQ_API_KEY")
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
GOOGLEAI_API_KEY = os.getenv("GOOGLEAI_API_KEY")

if GOOGLEAI_API_KEY:
    os.environ["GOOGLE_API_KEY"] = GOOGLEAI_API_KEY