import asyncio
import websockets
import requests
import json

async def test():
    print("Attempting to login...")
    try:
        response = requests.post("http://127.0.0.1:8000/auth/jwt/create/", json={
            "email": "annie@gmail.com",
            "password": "Thisis@mypassword12"
        })
        print("Login status:", response.status_code)
        
        if response.status_code != 200:
            print("Login response:", response.text)
            return
            
        data = response.json()
        token = data.get("access")
        print("Token acquired.")
        
        # Test valid token
        print("\nTesting valid token...")
        try:
            async with websockets.connect(f"ws://127.0.0.1:8000/ws/chat/?token={token}") as ws:
                print("Connected with valid token!")
                await asyncio.sleep(1)
        except Exception as e:
            print("Error with valid token:", e)

        # Test invalid token
        print("\nTesting invalid token...")
        try:
            async with websockets.connect(f"ws://127.0.0.1:8000/ws/chat/?token=invalid") as ws:
                print("Connected with invalid token!")
        except Exception as e:
            print("Error with invalid token:", e)
    except Exception as e:
        print("Fatal error:", e)

asyncio.run(test())
