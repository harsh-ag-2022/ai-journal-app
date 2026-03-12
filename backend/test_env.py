import os
from dotenv import load_dotenv

load_dotenv()

print("Testing .env variables:")
print(f"SUPABASE_URL: {'Loaded' if os.getenv('SUPABASE_URL') else 'Not Loaded'}")
print(f"SUPABASE_SERVICE_KEY: {'Loaded' if os.getenv('SUPABASE_SERVICE_KEY') else 'Not Loaded'}")
print(f"GEMINI_API_KEY: {'Loaded' if os.getenv('GEMINI_API_KEY') else 'Not Loaded'}")
