import os
from supabase import create_client, Client
from dotenv import load_dotenv

load_dotenv()

supabase_url = os.getenv("SUPABASE_URL")
supabase_key = os.getenv("SUPABASE_SERVICE_KEY")

if not supabase_url or not supabase_key:
    print("Error: SUPABASE_URL and SUPABASE_SERVICE_KEY must be set in .env")
    exit(1)

supabase: Client = create_client(supabase_url, supabase_key)

print("Attempting to create the journal_entries table via RPC...")
print("Note: The Supabase Python client doesn't support direct DDL commands like CREATE TABLE.")
print("To fix this, you have two options:")
print("1) Go to your Supabase Dashboard -> SQL Editor and paste the following:")
print('''
CREATE TABLE journal_entries (
  id uuid default gen_random_uuid() primary key,
  "userId" text not null,
  ambience text,
  text text not null,
  emotion text,
  keywords text[],
  summary text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);
''')
print("\n2) Or use the psycopg2 library to connect directly to the Postgres database if you have the connection string.")

# Let's try to verify if it can connect at least
try:
    # Just a simple query to test connection
    supabase.table('journal_entries').select("*").limit(1).execute()
    print("Connection successful! But the table might not exist if you get an error here.")
except Exception as e:
    print(f"\nConnection Test Result: {e}")
