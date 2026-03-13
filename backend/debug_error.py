import requests

API_URL = "http://localhost:8000/api/journal/analyze"

payload = {"text": "I feel so grateful for the simple things today. The sunshine was beautiful."}

try:
    print("Sending request...")
    r = requests.post(API_URL, json=payload)
    print("Status:", r.status_code)
    print("Response text:", r.text)
except Exception as e:
    print("Failed:", e)
