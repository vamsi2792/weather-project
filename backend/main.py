from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import requests

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"]
)

API_KEY = "df79cafa879d4b86f65661125fc6c1a7"

@app.get("/weather/{city}")
def get_weather(city: str):
    url = f"http://api.openweathermap.org/data/2.5/weather?q={city}&appid={API_KEY}&units=metric"
    response = requests.get(url)
    if response.status_code != 200:
        return {"error": "City not found"}
    return process_weather_data(response.json())

@app.get("/weather/coords/")
def get_weather_coords(lat: float, lon: float):
    url = f"http://api.openweathermap.org/data/2.5/weather?lat={lat}&lon={lon}&appid={API_KEY}&units=metric"
    response = requests.get(url)
    if response.status_code != 200:
        return {"error": "Location not found"}
    return process_weather_data(response.json())

@app.get("/forecast/{city}")
def get_forecast(city: str):
    url = f"http://api.openweathermap.org/data/2.5/forecast?q={city}&appid={API_KEY}&units=metric"
    response = requests.get(url)
    if response.status_code != 200:
        return {"error": "City not found"}
    return response.json()  # return raw forecast data (can process if needed)

@app.get("/alerts/{city}")
def get_alerts(city: str):
    # Get coordinates for the city
    geo_url = f"http://api.openweathermap.org/geo/1.0/direct?q={city}&limit=1&appid={API_KEY}"
    geo_resp = requests.get(geo_url)
    if geo_resp.status_code != 200 or not geo_resp.json():
        return {"error": "City not found"}

    lat = geo_resp.json()[0]["lat"]
    lon = geo_resp.json()[0]["lon"]

    onecall_url = f"http://api.openweathermap.org/data/2.5/onecall?lat={lat}&lon={lon}&appid={API_KEY}&exclude=current,minutely,hourly,daily"
    onecall_resp = requests.get(onecall_url)
    if onecall_resp.status_code != 200:
        return {"error": "Could not fetch alerts"}

    alerts = onecall_resp.json().get("alerts", [])
    return {"alerts": alerts}

def process_weather_data(data):
    return {
        "city": data["name"],
        "temperature": data["main"]["temp"],
        "feels_like": data["main"]["feels_like"],
        "humidity": data["main"]["humidity"],
        "wind_speed": data["wind"]["speed"],
        "description": data["weather"][0]["description"],
        "icon": data["weather"][0]["icon"]
    }
