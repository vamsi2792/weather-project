import React, { useState, useEffect } from "react";
import WeatherCard from "./WeatherCard";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts"; // install recharts with: npm install recharts

function App() {
  const [city, setCity] = useState("");
  const [weather, setWeather] = useState(null);
  const [forecast, setForecast] = useState(null);
  const [alerts, setAlerts] = useState([]);
  const [aqi, setAqi] = useState(null); // Air Quality Index
  const [hourly, setHourly] = useState([]); // Hourly forecast data
  const [loading, setLoading] = useState(false);
  const [isCelsius, setIsCelsius] = useState(true);

  // Offline status state
  const [isOffline, setIsOffline] = useState(!navigator.onLine);

  // Search history from localStorage (existing)
  const [history, setHistory] = useState(() => {
    return JSON.parse(localStorage.getItem("searchHistory") || "[]");
  });

  // Detect online/offline changes
  useEffect(() => {
    function handleOnline() {
      setIsOffline(false);
    }
    function handleOffline() {
      setIsOffline(true);
    }
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    // Load cached data if offline
    if (isOffline) {
      const cachedWeather = localStorage.getItem("cachedWeather");
      const cachedForecast = localStorage.getItem("cachedForecast");
      const cachedAlerts = localStorage.getItem("cachedAlerts");
      const cachedAqi = localStorage.getItem("cachedAqi");
      const cachedHourly = localStorage.getItem("cachedHourly");

      if (cachedWeather) setWeather(JSON.parse(cachedWeather));
      if (cachedForecast) setForecast(JSON.parse(cachedForecast));
      if (cachedAlerts) setAlerts(JSON.parse(cachedAlerts));
      if (cachedAqi) setAqi(JSON.parse(cachedAqi));
      if (cachedHourly) setHourly(JSON.parse(cachedHourly));
    }

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, [isOffline]);

  const getBackgroundColor = (description) => {
    if (!description) return "oklch(20.8% 0.042 265.755)";
    const desc = description.toLowerCase();
    if (desc.includes("rain")) return "#64748B";
    if (desc.includes("cloud")) return "#94A3B8";
    if (desc.includes("clear")) return "#FACC15";
    if (desc.includes("snow")) return "#F1F5F9";
    return "oklch(20.8% 0.042 265.755)";
  };

  const addToHistory = (cityName) => {
    if (!cityName) return;
    const newHistory = [cityName, ...history.filter((c) => c !== cityName)].slice(
      0,
      5
    );
    setHistory(newHistory);
    localStorage.setItem("searchHistory", JSON.stringify(newHistory));
  };

  // Fetch AQI by coordinates
  const fetchAQI = async (lat, lon) => {
    try {
      const res = await fetch(
        `http://127.0.0.1:8000/air-quality/?lat=${lat}&lon=${lon}`
      );
      const data = await res.json();
      if (!data.error) setAqi(data.aqi);
      else setAqi(null);
    } catch {
      setAqi(null);
    }
  };

  // Fetch hourly forecast by coordinates
  const fetchHourlyForecast = async (lat, lon) => {
    try {
      const res = await fetch(
        `http://127.0.0.1:8000/forecast/hourly/?lat=${lat}&lon=${lon}`
      );
      const data = await res.json();
      if (!data.error && data.hourly) setHourly(data.hourly);
      else setHourly([]);
    } catch {
      setHourly([]);
    }
  };

  // Unified fetch function to get weather, forecast, alerts + fetch AQI and hourly after weather by coords
  const fetchAllWeather = async (searchCity) => {
    setLoading(true);
    try {
      // Current weather
      const resWeather = await fetch(
        `http://127.0.0.1:8000/weather/${searchCity}`
      );
      const dataWeather = await resWeather.json();
      setWeather(dataWeather);

      // Forecast (5-day)
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

      // Get lat/lon for AQI & hourly (from weather)
      if (dataWeather && !dataWeather.error) {
        const lat = dataWeather.coord?.lat || null;
        const lon = dataWeather.coord?.lon || null;
        if (lat && lon) {
          await fetchAQI(lat, lon);
          await fetchHourlyForecast(lat, lon);
        } else {
          setAqi(null);
          setHourly([]);
        }
      }

      addToHistory(searchCity);
    } catch (error) {
      alert("Failed to fetch weather data");
      setAqi(null);
      setHourly([]);
    }
    setLoading(false);
  };

  // Cache data in localStorage on update (if no errors)
  useEffect(() => {
    if (weather && !weather.error) {
      localStorage.setItem("cachedWeather", JSON.stringify(weather));
    }
  }, [weather]);

  useEffect(() => {
    if (forecast && !forecast.error) {
      localStorage.setItem("cachedForecast", JSON.stringify(forecast));
    }
  }, [forecast]);

  useEffect(() => {
    if (alerts) {
      localStorage.setItem("cachedAlerts", JSON.stringify(alerts));
    }
  }, [alerts]);

  useEffect(() => {
    if (aqi !== null) {
      localStorage.setItem("cachedAqi", JSON.stringify(aqi));
    }
  }, [aqi]);

  useEffect(() => {
    if (hourly.length > 0) {
      localStorage.setItem("cachedHourly", JSON.stringify(hourly));
    }
  }, [hourly]);

  // On click get by city
  const fetchWeatherByCity = () => {
    if (!city) return;
    fetchAllWeather(city);
  };

  // Geolocation fetch with AQI & hourly
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

          if (dataWeather.city) {
            await fetchAllWeather(dataWeather.city);
          }

          await fetchAQI(latitude, longitude);
          await fetchHourlyForecast(latitude, longitude);
        } catch {
          alert("Failed to fetch weather");
          setAqi(null);
          setHourly([]);
        }
        setLoading(false);
      },
      () => {
        alert("Unable to get location.");
        setLoading(false);
      }
    );
  };

  const convertTemp = (tempC) => (isCelsius ? tempC : tempC * 9 / 5 + 32);
  const toggleUnit = () => setIsCelsius((prev) => !prev);

  const fetchWeatherByHistory = (cityName) => {
    setCity(cityName);
    fetchAllWeather(cityName);
  };

  // AQI color + message helper
  const getAQIColor = (index) => {
    switch (index) {
      case 1:
        return { color: "green", message: "Good" };
      case 2:
        return { color: "yellow", message: "Fair" };
      case 3:
        return { color: "orange", message: "Moderate" };
      case 4:
        return { color: "red", message: "Poor" };
      case 5:
        return { color: "purple", message: "Very Poor" };
      default:
        return { color: "gray", message: "Unknown" };
    }
  };

  // Prepare hourly data for chart (time, temp)
  const hourlyDataForChart = hourly.map((h) => ({
    time: new Date(h.dt * 1000).getHours() + ":00",
    temperature: convertTemp(h.temp).toFixed(1),
  }));

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center text-white transition-colors duration-700 p-4"
      style={{ backgroundColor: getBackgroundColor(weather?.description) }}
    >
      {isOffline && (
        <div className="bg-yellow-600 text-black p-2 rounded mb-4 w-full text-center font-semibold">
          You are offline. Showing cached data.
        </div>
      )}

      <h1 className="text-4xl font-bold mb-6">QuickWeather</h1>

      <div className="flex gap-2 mb-4 flex-wrap justify-center">
        <input
          type="text"
          placeholder="Enter city"
          value={city}
          onChange={(e) => setCity(e.target.value)}
          className="px-4 py-2 rounded-lg text-black"
          disabled={loading}
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

      {history.length > 0 && (
        <div className="mb-4 flex flex-col items-center gap-2">
          <p className="font-semibold mb-1 text-center">Search History:</p>
          <div className="flex gap-2 flex-wrap justify-center">
            {history.map((c) => (
              <button
                key={c}
                className="bg-gray-700 px-3 py-1 rounded hover:bg-gray-600"
                onClick={() => fetchWeatherByHistory(c)}
                disabled={loading}
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
            disabled={loading}
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

      {/* AQI Display */}
      {aqi !== null && (
        <div className="mt-6 bg-white bg-opacity-20 p-4 rounded-lg text-center max-w-sm w-full">
          <h2 className="text-xl font-bold mb-2">Air Quality Index (AQI)</h2>
          <p
            className="text-2xl font-semibold"
            style={{ color: getAQIColor(aqi).color }}
          >
            {aqi} - {getAQIColor(aqi).message}
          </p>
        </div>
      )}

      {/* 5-day Forecast */}
      {forecast && !forecast.error && (
        <div className="mt-6 max-w-4xl w-full overflow-x-auto px-4">
          <h2 className="text-2xl font-bold mb-2 text-center">5-Day Forecast</h2>
          <div className="flex gap-4 justify-center flex-wrap">
            {forecast.list
              .filter((_, idx) => idx % 8 === 0)
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

      {/* Hourly Forecast Chart */}
      {hourly.length > 0 && (
        <div className="mt-6 max-w-4xl w-full px-4 bg-white bg-opacity-20 p-4 rounded-lg">
          <h2 className="text-2xl font-bold mb-2 text-center">24h Hourly Forecast</h2>
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={hourlyDataForChart}>
              <XAxis dataKey="time" />
              <YAxis
                label={{
                  value: `Temperature (°${isCelsius ? "C" : "F"})`,
                  angle: -90,
                  position: "insideLeft",
                  offset: 0,
                }}
              />
              <Tooltip />
              <Line
                type="monotone"
                dataKey="temperature"
                stroke="#FFBB28"
                strokeWidth={2}
                dot={{ r: 3 }}
              />
            </LineChart>
          </ResponsiveContainer>
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
