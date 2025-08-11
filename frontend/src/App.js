import React, { useState } from "react";
import WeatherCard from "./WeatherCard";

function App() {
  const [city, setCity] = useState("");
  const [weather, setWeather] = useState(null);

  const fetchWeatherByCity = async () => {
    if (!city) return;
    const res = await fetch(`http://127.0.0.1:8000/weather/${city}`);
    const data = await res.json();
    setWeather(data);
  };

  const fetchWeatherByLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(async (position) => {
        const { latitude, longitude } = position.coords;
        const res = await fetch(
          `http://127.0.0.1:8000/weather/coords/?lat=${latitude}&lon=${longitude}`
        );
        const data = await res.json();
        setWeather(data);
      });
    } else {
      alert("Geolocation is not supported by your browser.");
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center text-white"
  style={{ backgroundColor: "oklch(20.8% 0.042 265.755)" }}>
  <h1 className="text-4xl font-bold mb-6">QuickWeather</h1>
  <div className="flex gap-2 mb-4">
    <input
      type="text"
      placeholder="Enter city"
      value={city}
      onChange={(e) => setCity(e.target.value)}
      className="px-4 py-2 rounded-lg text-black"
    />
    <button
      onClick={fetchWeatherByCity}
      className="bg-yellow-400 hover:bg-yellow-500 px-4 py-2 rounded-lg text-black"
    >
      Get Weather
    </button>
    <button
      onClick={fetchWeatherByLocation}
      className="bg-green-400 hover:bg-green-500 px-4 py-2 rounded-lg text-black"
    >
      Use My Location
    </button>
  </div>
  {weather && !weather.error && <WeatherCard weather={weather} />}
</div>

  );
}

export default App;
