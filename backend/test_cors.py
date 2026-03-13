import requests

API_URL = "http://localhost:8000/api/journal/analyze"

print("--- Testing OPTIONS for CORS ---")
try:
    r = requests.options(API_URL, headers={"Origin": "http://localhost:3000", "Access-Control-Request-Method": "POST"})
    print("OPTIONS status:", r.status_code)
    print("OPTIONS headers:", r.headers)
except Exception as e:
    print("OPTIONS Failed:", e)

print("\n--- Testing POST ---")
try:
    r = requests.post(API_URL, json={"text": "Hello again"}, headers={"Origin": "http://localhost:3000"})
    print("POST status:", r.status_code)
    print("POST headers:", r.headers)
    print("POST response:", r.text[:100])
except Exception as e:
    print("POST Failed:", e)
