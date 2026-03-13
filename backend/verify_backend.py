import requests
import time
import json
import threading

API_URL = "http://localhost:8000/api/journal/analyze"

def verify_caching_and_streaming():
    print("--- 1. Testing Caching & Streaming ---")
    payload = {"text": "I feel so grateful for the simple things today. The sunshine was beautiful."}
    
    # First request - should call Gemini
    print("Sending first request (Expect LLM call latency)...")
    start = time.time()
    try:
        # Use stream=True to read SSE
        with requests.post(API_URL, json=payload, stream=True) as r:
            if r.status_code == 200:
                for line in r.iter_lines():
                    if line:
                        print("Chunk:", line.decode("utf-8"))
            else:
                print("Error:", r.status_code, r.text)
    except Exception as e:
        print("Failed:", e)
    t1 = time.time() - start
    print(f"First request took: {t1:.2f}s\n")
    
    # Wait a sec
    time.sleep(1)
    
    # Second request - should return instantly from cache
    print("Sending second request (Expect Instant Cache Return)...")
    start = time.time()
    try:
        with requests.post(API_URL, json=payload, stream=True) as r:
            if r.status_code == 200:
                for line in r.iter_lines():
                    if line:
                        # Should print the whole JSON chunk at once
                        print("Chunk:", line.decode("utf-8"))
            else:
                print("Error:", r.status_code, r.text)
    except Exception as e:
        print("Failed:", e)
    t2 = time.time() - start
    print(f"Second request took: {t2:.2f}s\n")
    
    if t2 < t1 * 0.5:
        print("\033[92mSUCCESS: Caching is working! Second request was significantly faster.\033[0m\n")
    else:
        print("\033[93mWARNING: Caching might not be working as expected.\033[0m\n")

def check_rate_limit(i, results):
    payload = {"text": f"Spam message {i}"}
    try:
        r = requests.post(API_URL, json=payload)
        results.append(r.status_code)
    except Exception as e:
        results.append(str(e))

def verify_rate_limiting():
    print("--- 2. Testing Rate Limiting (5/min) ---")
    results = []
    threads = []
    # Send 7 requests simultaneously (which should trip the 5/min limit)
    print("Sending 7 requests concurrently...")
    for i in range(7):
        t = threading.Thread(target=check_rate_limit, args=(i, results))
        threads.append(t)
        t.start()
        
    for t in threads:
        t.join()
        
    print(f"Status Codes Status: {results}")
    if 429 in results:
        print("\033[92mSUCCESS: Rate limit (429 Too Many Requests) successfully triggered!\033[0m\n")
    else:
        print("\033[91mFAILURE: Rate limit did not trigger.\033[0m\n")

if __name__ == "__main__":
    verify_caching_and_streaming()
    verify_rate_limiting()
