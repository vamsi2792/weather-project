import React from "react";

function WeatherCard({ weather }) {
  return (
    <div className="bg-white bg-opacity-20 p-6 rounded-xl shadow-lg backdrop-blur-md text-center animate-fadeIn">
  <h2 className="text-2xl font-semibold">{weather.city}</h2>
  <img
    src={`http://openweathermap.org/img/wn/${weather.icon}@4x.png`}
    alt="weather icon"
    className="mx-auto"
  />
  <p className="text-lg">{weather.temperature}°C (Feels like {weather.feels_like}°C)</p>
  <p>Humidity: {weather.humidity}%</p>
  <p>Wind Speed: {weather.wind_speed} m/s</p>
  <p className="capitalize">{weather.description}</p>
</div>

  );
}

export default WeatherCard;
