import requests

res = requests.post("http://localhost:8000/api/journal/analyze", json={"text": "I feel very happy today!"})
print("STATUS CODE:", res.status_code)
print("RESPONSE:", res.text)
