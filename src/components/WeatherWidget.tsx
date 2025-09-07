"use client";

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useDebouncedValue } from '@/hooks/use-debounced-value';
import { 
  Cloud, 
  Sun, 
  CloudRain, 
  CloudSnow, 
  CloudDrizzle, 
  Zap,
  CloudFog,
  Wind,
  Eye,
  Droplets,
  Thermometer,
  Search,
  MapPin,
  Edit3,
  Check,
  X
} from 'lucide-react';

interface WeatherData {
  current: {
    temperature: number;
    humidity: number;
    windSpeed: number;
    windGusts: number;
    dewPoint: number;
    weatherCode: number;
    description: string;
  };
  daily: {
    temperatureMin: number[];
    temperatureMax: number[];
    precipitationSum: number[];
  };
}

interface RadarPlace {
  _id: string;
  formattedAddress: string;
  geometry: {
    coordinates: [number, number]; // [longitude, latitude]
  };
}

interface WeatherWidgetProps {
  projectLocation?: string;
  className?: string;
}

// Weather code to icon mapping based on WMO codes
const getWeatherIcon = (code: number) => {
  if (code === 0) return Sun; // Clear sky
  if (code <= 3) return Cloud; // Mainly clear, partly cloudy, overcast
  if ([45, 48].includes(code)) return CloudFog; // Fog
  if ([51, 53, 55, 56, 57].includes(code)) return CloudDrizzle; // Drizzle
  if ([61, 63, 65, 66, 67, 80, 81, 82].includes(code)) return CloudRain; // Rain
  if ([71, 73, 75, 77, 85, 86].includes(code)) return CloudSnow; // Snow
  if ([95, 96, 99].includes(code)) return Zap; // Thunderstorm
  return Cloud; // Default
};

const getWeatherDescription = (code: number): string => {
  const descriptions: { [key: number]: string } = {
    0: 'Clear sky',
    1: 'Mainly clear',
    2: 'Partly cloudy',
    3: 'Overcast',
    45: 'Fog',
    48: 'Depositing rime fog',
    51: 'Light drizzle',
    53: 'Moderate drizzle',
    55: 'Dense drizzle',
    61: 'Slight rain',
    63: 'Moderate rain',
    65: 'Heavy rain',
    71: 'Slight snow fall',
    73: 'Moderate snow fall',
    75: 'Heavy snow fall',
    80: 'Slight rain showers',
    81: 'Moderate rain showers',
    82: 'Violent rain showers',
    95: 'Thunderstorm',
    96: 'Thunderstorm with slight hail',
    99: 'Thunderstorm with heavy hail'
  };
  return descriptions[code] || 'Unknown';
};

export default function WeatherWidget({ projectLocation, className = '' }: WeatherWidgetProps) {
  const [location, setLocation] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [places, setPlaces] = useState<RadarPlace[]>([]);
  const [weatherData, setWeatherData] = useState<WeatherData | null>(null);
  const [isLoadingPlaces, setIsLoadingPlaces] = useState(false);
  const [isLoadingWeather, setIsLoadingWeather] = useState(false);
  const [coordinates, setCoordinates] = useState<[number, number] | null>(null);
  const [showDropdown, setShowDropdown] = useState(false);
  
  const debouncedSearchQuery = useDebouncedValue(searchQuery, 300);

  // Search places using Radar API
  const searchPlaces = useCallback(async (query: string) => {
    if (!query.trim()) {
      setPlaces([]);
      return;
    }

    setIsLoadingPlaces(true);
    try {
      const response = await fetch(`/api/places/search?query=${encodeURIComponent(query)}`);
      const data = await response.json();
      setPlaces(data.places || []);
    } catch (error) {
      console.error('Error searching places:', error);
      setPlaces([]);
    } finally {
      setIsLoadingPlaces(false);
    }
  }, []);

  // Fetch weather data using Open-Meteo API
  const fetchWeatherData = useCallback(async (lat: number, lon: number) => {
    setIsLoadingWeather(true);
    try {
      const response = await fetch(
        `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,weather_code,wind_speed_10m,wind_gusts_10m,relative_humidity_2m,dew_point_2m&daily=temperature_2m_min,temperature_2m_max,precipitation_sum&timezone=auto&past_days=3&forecast_days=1`
      );
      const data = await response.json();
      
      const current = data.current;
      const daily = data.daily;
      
      setWeatherData({
        current: {
          temperature: Math.round(current.temperature_2m),
          humidity: current.relative_humidity_2m,
          windSpeed: Math.round(current.wind_speed_10m),
          windGusts: Math.round(current.wind_gusts_10m),
          dewPoint: Math.round(current.dew_point_2m),
          weatherCode: current.weather_code,
          description: getWeatherDescription(current.weather_code)
        },
        daily: {
          temperatureMin: daily.temperature_2m_min.map((temp: number) => Math.round(temp)),
          temperatureMax: daily.temperature_2m_max.map((temp: number) => Math.round(temp)),
          precipitationSum: daily.precipitation_sum
        }
      });
    } catch (error) {
      console.error('Error fetching weather:', error);
      setWeatherData(null);
    } finally {
      setIsLoadingWeather(false);
    }
  }, []);

  // Search places when search query changes
  useEffect(() => {
    if (debouncedSearchQuery) {
      searchPlaces(debouncedSearchQuery);
      setShowDropdown(true);
    } else {
      setPlaces([]);
      setShowDropdown(false);
    }
  }, [debouncedSearchQuery, searchPlaces]);

  // Fetch weather when coordinates are set
  useEffect(() => {
    if (coordinates) {
      fetchWeatherData(coordinates[1], coordinates[0]); // lat, lon
    }
  }, [coordinates, fetchWeatherData]);

  // Handle project location - simple and clean
  useEffect(() => {
    if (projectLocation) {
      setLocation(projectLocation);
      // Search for coordinates
      searchPlaces(projectLocation).then(() => {
        // Auto-select first result after search completes
        setTimeout(async () => {
          try {
            const response = await fetch(`/api/places/search?query=${encodeURIComponent(projectLocation)}`);
            const data = await response.json();
            if (data.places && data.places.length > 0) {
              const firstPlace = data.places[0];
              setLocation(firstPlace.formattedAddress);
              setCoordinates(firstPlace.geometry.coordinates);
            }
          } catch (error) {
            console.error('Error auto-selecting place:', error);
          }
        }, 100);
      });
    }
  }, [projectLocation]);

  const handlePlaceSelect = (place: RadarPlace) => {
    setLocation(place.formattedAddress);
    setCoordinates(place.geometry.coordinates);
    setSearchQuery('');
    setPlaces([]);
    setShowDropdown(false);
  };

  const handleLocationInputChange = (value: string) => {
    setSearchQuery(value);
    if (!value.trim()) {
      setShowDropdown(false);
      // If user clears the input, reset everything
      setLocation('');
      setCoordinates(null);
      setWeatherData(null);
    }
  };

  const handleInputFocus = () => {
    setSearchQuery(location);
    if (places.length > 0) {
      setShowDropdown(true);
    }
  };

  const handleInputBlur = () => {
    // If user didn't select anything, revert search query
    if (!showDropdown) {
      setSearchQuery('');
    }
    // Delay hiding dropdown to allow clicking on items
    setTimeout(() => setShowDropdown(false), 200);
  };

  const WeatherIcon = weatherData ? getWeatherIcon(weatherData.current.weatherCode) : Cloud;

  return (
    <Card className={`relative ${className}`}>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400 flex items-center">
          <Cloud className="w-4 h-4 mr-2" />
          Weather
        </CardTitle>
      </CardHeader>
      
      <CardContent className="pt-0">
        <div className="space-y-4">
          {/* Location Search Input - Always Visible */}
          <div className="relative">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search location..."
                value={searchQuery || location}
                onChange={(e) => handleLocationInputChange(e.target.value)}
                onFocus={handleInputFocus}
                onBlur={handleInputBlur}
                className="pl-10 pr-4"
              />
            </div>
            
            {isLoadingPlaces && (
              <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
              </div>
            )}
            
            {showDropdown && places.length > 0 && (
              <div className="absolute z-10 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md shadow-lg max-h-60 overflow-y-auto">
                {places.map((place) => (
                  <button
                    key={place._id}
                    onClick={() => handlePlaceSelect(place)}
                    className="w-full px-3 py-2 text-left hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center space-x-2 text-sm"
                  >
                    <MapPin className="h-3 w-3 text-gray-400 flex-shrink-0" />
                    <span className="truncate">{place.formattedAddress}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Current Location Display */}
          {location && (
            <div className="flex items-center space-x-2 text-xs text-gray-500 dark:text-gray-400">
              <MapPin className="h-3 w-3" />
              <span className="truncate">{location}</span>
            </div>
          )}

          {/* Weather Data */}
          {coordinates ? (
            isLoadingWeather ? (
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {Array.from({ length: 4 }).map((_, index) => (
                  <Card key={index}>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400">
                        {index === 0 ? 'Humidity' : index === 1 ? 'Precipitation Stance' : index === 2 ? 'Temperature' : 'Wind Speed'}
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2 text-xs">
                        <Skeleton className="h-4 w-full" />
                        <Skeleton className="h-4 w-full" />
                        <Skeleton className="h-4 w-full" />
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : weatherData ? (
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Humidity Section */}
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400">Humidity</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2 text-xs">
                      <div className="flex justify-between">
                        <span className="text-gray-600 dark:text-gray-400">Low</span>
                        <span className="text-gray-900 dark:text-gray-100">N/A</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600 dark:text-gray-400">Avg</span>
                        <span className="text-gray-900 dark:text-gray-100">{weatherData.current.humidity}%</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600 dark:text-gray-400">High</span>
                        <span className="text-gray-900 dark:text-gray-100">N/A</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600 dark:text-gray-400">Dew</span>
                        <span className="text-gray-900 dark:text-gray-100">{weatherData.current.dewPoint}°</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Precipitation Section */}
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400">Precipitation Stance</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2 text-xs">
                      <div className="flex justify-between">
                        <span className="text-gray-600 dark:text-gray-400">Midnight</span>
                        <span className="text-gray-900 dark:text-gray-100">N/A</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600 dark:text-gray-400">2 Days Ago</span>
                        <span className="text-gray-900 dark:text-gray-100">{weatherData.daily.precipitationSum[1]?.toFixed(1) || '0'}mm</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600 dark:text-gray-400">3 Days Ago</span>
                        <span className="text-gray-900 dark:text-gray-100">{weatherData.daily.precipitationSum[0]?.toFixed(1) || '0'}mm</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Temperature Section */}
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400">Temperature</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2 text-xs">
                      <div className="flex justify-between">
                        <span className="text-gray-600 dark:text-gray-400">Low</span>
                        <span className="text-gray-900 dark:text-gray-100">{weatherData.daily.temperatureMin[weatherData.daily.temperatureMin.length - 1]}°C</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600 dark:text-gray-400">Avg</span>
                        <span className="text-gray-900 dark:text-gray-100">{weatherData.current.temperature}°C</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600 dark:text-gray-400">High</span>
                        <span className="text-gray-900 dark:text-gray-100">{weatherData.daily.temperatureMax[weatherData.daily.temperatureMax.length - 1]}°C</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Wind Speed Section */}
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400">Wind Speed</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2 text-xs">
                      <div className="flex justify-between">
                        <span className="text-gray-600 dark:text-gray-400">Avg</span>
                        <span className="text-gray-900 dark:text-gray-100">{weatherData.current.windSpeed} km/h</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600 dark:text-gray-400">Max</span>
                        <span className="text-gray-900 dark:text-gray-100">N/A</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600 dark:text-gray-400">Gusts</span>
                        <span className="text-gray-900 dark:text-gray-100">{weatherData.current.windGusts} km/h</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            ) : (
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Humidity Section */}
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400">Humidity</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2 text-xs">
                      <div className="flex justify-between">
                        <span className="text-gray-600 dark:text-gray-400">Low</span>
                        <span className="text-gray-900 dark:text-gray-100">N/A</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600 dark:text-gray-400">Avg</span>
                        <span className="text-gray-900 dark:text-gray-100">N/A</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600 dark:text-gray-400">High</span>
                        <span className="text-gray-900 dark:text-gray-100">N/A</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600 dark:text-gray-400">Dew</span>
                        <span className="text-gray-900 dark:text-gray-100">N/A</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Precipitation Section */}
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400">Precipitation Stance</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2 text-xs">
                      <div className="flex justify-between">
                        <span className="text-gray-600 dark:text-gray-400">Midnight</span>
                        <span className="text-gray-900 dark:text-gray-100">N/A</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600 dark:text-gray-400">2 Days Ago</span>
                        <span className="text-gray-900 dark:text-gray-100">N/A</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600 dark:text-gray-400">3 Days Ago</span>
                        <span className="text-gray-900 dark:text-gray-100">N/A</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Temperature Section */}
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400">Temperature</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2 text-xs">
                      <div className="flex justify-between">
                        <span className="text-gray-600 dark:text-gray-400">Low</span>
                        <span className="text-gray-900 dark:text-gray-100">N/A</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600 dark:text-gray-400">Avg</span>
                        <span className="text-gray-900 dark:text-gray-100">N/A</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600 dark:text-gray-400">High</span>
                        <span className="text-gray-900 dark:text-gray-100">N/A</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Wind Speed Section */}
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400">Wind Speed</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2 text-xs">
                      <div className="flex justify-between">
                        <span className="text-gray-600 dark:text-gray-400">Avg</span>
                        <span className="text-gray-900 dark:text-gray-100">N/A</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600 dark:text-gray-400">Max</span>
                        <span className="text-gray-900 dark:text-gray-100">N/A</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600 dark:text-gray-400">Gusts</span>
                        <span className="text-gray-900 dark:text-gray-100">N/A</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )
          ) : (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Humidity Section */}
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400">Humidity</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 text-xs">
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400">Low</span>
                      <span className="text-gray-900 dark:text-gray-100">N/A</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400">Avg</span>
                      <span className="text-gray-900 dark:text-gray-100">N/A</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400">High</span>
                      <span className="text-gray-900 dark:text-gray-100">N/A</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400">Dew</span>
                      <span className="text-gray-900 dark:text-gray-100">N/A</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Precipitation Section */}
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400">Precipitation Stance</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 text-xs">
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400">Midnight</span>
                      <span className="text-gray-900 dark:text-gray-100">N/A</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400">2 Days Ago</span>
                      <span className="text-gray-900 dark:text-gray-100">N/A</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400">3 Days Ago</span>
                      <span className="text-gray-900 dark:text-gray-100">N/A</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Temperature Section */}
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400">Temperature</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 text-xs">
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400">Low</span>
                      <span className="text-gray-900 dark:text-gray-100">N/A</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400">Avg</span>
                      <span className="text-gray-900 dark:text-gray-100">N/A</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400">High</span>
                      <span className="text-gray-900 dark:text-gray-100">N/A</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Wind Speed Section */}
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400">Wind Speed</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 text-xs">
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400">Avg</span>
                      <span className="text-gray-900 dark:text-gray-100">N/A</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400">Max</span>
                      <span className="text-gray-900 dark:text-gray-100">N/A</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400">Gusts</span>
                      <span className="text-gray-900 dark:text-gray-100">N/A</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}