import React, { useState, useEffect } from "react";
import WeatherCard from "./WeatherCard";

function App() {
  const [city, setCity] = useState("");
  const [weather, setWeather] = useState(null);
  const [forecast, setForecast] = useState(null); // NEW
  const [alerts, setAlerts] = useState([]); // NEW
  const [loading, setLoading] = useState(false);
  const [isCelsius, setIsCelsius] = useState(true);

  // Load search history from localStorage on first render
  const [history, setHistory] = useState(() => {
    return JSON.parse(localStorage.getItem("searchHistory") || "[]");
  });

  // Map weather description to background color (fallback to oklch)
  const getBackgroundColor = (description) => {
    if (!description) return "oklch(20.8% 0.042 265.755)";
    const desc = description.toLowerCase();
    if (desc.includes("rain")) return "#64748B"; // Tailwind slate-500 (grayish blue)
    if (desc.includes("cloud")) return "#94A3B8"; // Tailwind slate-400
    if (desc.includes("clear")) return "#FACC15"; // Tailwind yellow-400
    if (desc.includes("snow")) return "#F1F5F9"; // Tailwind slate-100 (almost white)
    return "oklch(20.8% 0.042 265.755)";
  };

  // Save city to localStorage history (max 5, no duplicates)
  const addToHistory = (cityName) => {
    if (!cityName) return;
    const newHistory = [
      cityName,
      ...history.filter((c) => c !== cityName),
    ].slice(0, 5);
    setHistory(newHistory);
    localStorage.setItem("searchHistory", JSON.stringify(newHistory));
  };

  // Unified fetch to get weather, forecast, alerts
  const fetchAllWeather = async (searchCity) => {
    setLoading(true);
    try {
      // Current weather
      const resWeather = await fetch(
        `http://127.0.0.1:8000/weather/${searchCity}`
      );
      const dataWeather = await resWeather.json();
      setWeather(dataWeather);

      // Forecast
      const resForecast = await fetch(
        `http://127.0.0.1:8000/forecast/${searchCity}`
      );
      const dataForecast = await resForecast.json();
      setForecast(dataForecast);

      // Alerts
      const resAlerts = await fetch(
        `http://127.0.0.1:8000/alerts/${searchCity}`
      );
      const dataAlerts = await resAlerts.json();
      setAlerts(dataAlerts.alerts || []);

      addToHistory(searchCity);
    } catch (error) {
      alert("Failed to fetch weather data");
    }
    setLoading(false);
  };

  // Calls the unified fetch on user input
  const fetchWeatherByCity = () => {
    if (!city) return;
    fetchAllWeather(city);
  };

  // Geolocation fetch, also loads forecast and alerts
  const fetchWeatherByLocation = () => {
    if (!navigator.geolocation) {
      alert("Geolocation is not supported by your browser.");
      return;
    }
    setLoading(true);
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          const { latitude, longitude } = position.coords;
          const resWeather = await fetch(
            `http://127.0.0.1:8000/weather/coords/?lat=${latitude}&lon=${longitude}`
          );
          const dataWeather = await resWeather.json();
          setWeather(dataWeather);

          // Use city from weather response to fetch forecast & alerts
          if (dataWeather.city) {
            await fetchAllWeather(dataWeather.city);
          }
        } catch (err) {
          alert("Failed to fetch weather");
        }
        setLoading(false);
      },
      () => {
        alert("Unable to get location.");
        setLoading(false);
      }
    );
  };

  // Convert temperature if needed
  const convertTemp = (tempC) => (isCelsius ? tempC : (tempC * 9) / 5 + 32);

  const toggleUnit = () => setIsCelsius((prev) => !prev);

  // Clicking on history items reloads weather data
  const fetchWeatherByHistory = (cityName) => {
    setCity(cityName);
    fetchAllWeather(cityName);
  };

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center text-white transition-colors duration-700 p-4"
      style={{ backgroundColor: getBackgroundColor(weather?.description) }}
    >
      <h1 className="text-4xl font-bold mb-6">QuickWeather</h1>

      <div className="flex gap-2 mb-4 flex-wrap justify-center">
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
          disabled={loading}
        >
          Get Weather
        </button>
        <button
          onClick={fetchWeatherByLocation}
          className="bg-green-400 hover:bg-green-500 px-4 py-2 rounded-lg text-black"
          disabled={loading}
        >
          Use My Location
        </button>
        <button
          onClick={toggleUnit}
          className="bg-gray-800 hover:bg-gray-900 px-4 py-2 rounded-lg text-white"
          disabled={!weather}
          title="Toggle °C / °F"
        >
          °{isCelsius ? "F" : "C"}
        </button>
      </div>

      {/* Search history buttons */}
      {history.length > 0 && (
        <div className="mb-4 flex flex-col items-center gap-2">
          <p className="font-semibold mb-1 text-center">Search History:</p>
          <div className="flex gap-2 flex-wrap justify-center">
            {history.map((c) => (
              <button
                key={c}
                className="bg-gray-700 px-3 py-1 rounded hover:bg-gray-600"
                onClick={() => fetchWeatherByHistory(c)}
              >
                {c}
              </button>
            ))}
          </div>
          <button
            onClick={() => {
              localStorage.removeItem("searchHistory");
              setHistory([]);
            }}
            className="mt-2 bg-gray-600 hover:bg-gray-700 text-white px-4 py-1 rounded"
            title="Clear search history"
          >
            Clear History
          </button>
        </div>
      )}

      {loading && <div className="text-xl mb-4 animate-pulse">Loading...</div>}

      {/* Current Weather */}
      {weather && !weather.error && (
        <WeatherCard
          weather={{
            ...weather,
            temperature: convertTemp(weather.temperature).toFixed(1),
            feels_like: convertTemp(weather.feels_like).toFixed(1),
          }}
          isCelsius={isCelsius}
        />
      )}

      {weather && weather.error && (
        <p className="text-red-500 font-semibold">{weather.error}</p>
      )}

      {/* 5-day Forecast */}
      {forecast && !forecast.error && (
        <div className="mt-6 max-w-4xl w-full overflow-x-auto px-4">
          <h2 className="text-2xl font-bold mb-2 text-center">
            5-Day Forecast
          </h2>
          <div className="flex gap-4 justify-center flex-wrap">
            {forecast.list
              .filter((_, idx) => idx % 8 === 0) // 1 item per day (approx)
              .map((item) => (
                <div
                  key={item.dt}
                  className="bg-white bg-opacity-20 p-4 rounded-lg text-center min-w-[120px]"
                >
                  <p>{new Date(item.dt * 1000).toLocaleDateString()}</p>
                  <img
                    src={`http://openweathermap.org/img/wn/${item.weather[0].icon}@2x.png`}
                    alt={item.weather[0].description}
                    className="mx-auto"
                  />
                  <p>
                    {convertTemp(item.main.temp).toFixed(1)} °
                    {isCelsius ? "C" : "F"}
                  </p>
                  <p className="capitalize">{item.weather[0].description}</p>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* Weather Alerts */}
      {alerts.length > 0 && (
        <div className="mt-6 max-w-4xl w-full bg-red-600 bg-opacity-70 p-4 rounded-lg px-6">
          <h2 className="text-xl font-bold mb-2 text-center">Weather Alerts</h2>
          {alerts.map((alert, idx) => (
            <div key={idx} className="mb-4">
              <p className="font-semibold">{alert.event}</p>
              <p>{alert.description}</p>
              <p className="text-sm">
                From: {new Date(alert.start * 1000).toLocaleString()} — To:{" "}
                {new Date(alert.end * 1000).toLocaleString()}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default App;
