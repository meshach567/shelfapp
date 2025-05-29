import { StyleSheet, Text, View, TextInput, Button, Image, ScrollView, ActivityIndicator, useColorScheme } from "react-native";
import * as Location from "expo-location";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useEffect, useState } from "react";

const API_KEY = process.env.EXPO_PUBLIC_API_KEY!;

export default function App() {
  type WeatherData = {
    weather: { description: string; icon: string }[];
    main: { temp: number };
    name: string;
  } | null;

  const [options, setOptions] = useState<{
    forecast: WeatherData[];
    favorites: string[];
    loading: boolean;
    city: string;
    weather: WeatherData;
    error: string;
    dailyForecast?: any[]; // Add this line
  }>({
    loading: false,
    city: "",
    weather: null,
    forecast: [],
    favorites: [],
    error: "",
    dailyForecast: [], // Add this line
  });

  const theme = useColorScheme();

  useEffect(() => {
    // Load favorites from AsyncStorage
    const loadFavorites = async () => {
      try {
        const data = await AsyncStorage.getItem("favorites");
        if (data) setOptions({
          ...options,
          favorites: JSON.parse(JSON.parse(data)),
        });
      } catch (error) {
        console.error("Failed to load favorites:", error);
      }
    };
    loadFavorites();
  }, []);

  // Fetch weather function
  async function fetchWeather(cityName?: string) {
    if (!cityName?.trim().toLowerCase()) {
      setOptions({...options, loading: true});
      return;
    }
    try {
      const weatherRes = await fetch(
        `https://api.openweathermap.org/data/2.5/weather?q=${cityName}&appid=${API_KEY}&units=metric`
      );

      const weatherData = await weatherRes.json();

      const forecastRes = await fetch(
        `https://api.openweathermap.org/data/2.5/forecast?q=${cityName}&appid=${API_KEY}&units=metric`
      );
      const forecastData = await forecastRes.json();

      if (weatherData.cod !== 200) {
        setOptions({
          ...options,
          weather: null,
          forecast: [],
        });
      } else {
        setOptions({
          ...options,
          weather: weatherData,
          dailyForecast : forecastData.list.filter((item: any, index: number) =>
            index % 8 === 0
          ),
          error: "",
        });
      }
    } catch (error) {
      setOptions({
        ...options,
        error:
          error instanceof Error
            ? error.message
            : "An unexpected error occurred",
      });
    }
    setOptions({...options, loading: false})
  }

  const fetchWeatherByLocation = async () => {
    setOptions({ ...options, loading: true});
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        setOptions({ ...options, error: "Permission to access location was denied", loading: false });
        return;
      }
      const loc = await Location.getCurrentPositionAsync({});
      const res = await fetch(
        `https://api.openweathermap.org/data/2.5/weather?lat=${loc.coords.latitude}&lon=${loc.coords.longitude}&appid=${API_KEY}&units=metric`
      )
      const data = await res.json();
      setOptions({ ...options, weather: data, city: data.name});
      fetchWeather(data.name);
    } catch (error) {
      setOptions({
        ...options,
        error: error instanceof Error ? error.message : "An unexpected error occurred",
      });
    }
    setOptions({ ...options, loading: false });
  }

  const addToFavorites = async (cityName?: string) => {
    try {
      const existing = await AsyncStorage.getItem('favorites');
      const list = existing ? JSON.parse(existing) : [];
      if (!list.includes(cityName)) {
        list.push(cityName);
        await AsyncStorage.setItem('favorites', JSON.stringify(list));
        setOptions({
          ...options,
          favorites: list,
        });
      }
    } catch (e) {
      console.log('Error saving favorite', e);
    }
  };

  const loadFavorites = async () => {
    try {
      const data = await AsyncStorage.getItem('favorites');
      if (data) setOptions({
        ...options,
        favorites: JSON.parse(data),
      });
    } catch (e) {
      console.log('Error loading favorites', e);
    }
  };

  // Add setCity function to update city in options state
  const setCity = (city: string) => setOptions({ ...options, city });

  const styles = getStyles(theme ?? null);
  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Weather App</Text>

      <TextInput
        placeholder="Enter city"
        value={options.city}
        onChangeText={setCity}
        style={styles.input}
        placeholderTextColor={theme === 'dark' ? '#aaa' : '#555'}
      />
      <Button title="Search" onPress={() => fetchWeather(options.city)} />
      <Button title="Use My Location" onPress={fetchWeatherByLocation} />

      {options.loading && <ActivityIndicator size="large" color="#007AFF" style={{ marginVertical: 20 }} />}

      {options.error ? <Text style={styles.error}>{options.error}</Text> : null}

      {options.weather && (
        <View style={styles.weatherContainer}>
          <Text style={styles.cityName}>{options.weather.name}</Text>
          <Text style={styles.temp}>{options.weather.main.temp}°C</Text>
          <Image
            source={{ uri: `https://openweathermap.org/img/wn/${options.weather.weather[0].icon}.png` }}
            style={{ width: 80, height: 80 }}
          />
          <Text style={styles.description}>{options.weather.weather[0].description}</Text>
          <Button title="Add to Favorites" onPress={() => addToFavorites(options?.weather?.name)} />
        </View>
      )}

      {options.forecast.length > 0 && (
        <>
          <Text style={styles.subtitle}>3-Day Forecast</Text>
          <ScrollView horizontal style={styles.forecastContainer}>
            {options.forecast.map((item, idx) => (
              <View key={idx} style={styles.forecastItem}>
                <Text>{new Date().toDateString()}</Text>
                <Image
                  source={{ uri: `https://openweathermap.org/img/wn/${item?.weather[0].icon}.png` }}
                  style={{ width: 50, height: 50 }}
                />
                <Text>{item?.main.temp}°C</Text>
              </View>
            ))}
          </ScrollView>
        </>
      )}

      {options.favorites.length > 0 && (
        <>
          <Text style={styles.subtitle}>Favorites</Text>
          {options.favorites.map((fav, i) => (
            <Button key={i} title={fav} onPress={() => fetchWeather(fav)} />
          ))}
        </>
      )}
    </ScrollView>
  );
}

const getStyles = (theme: string | null) =>
  StyleSheet.create({
    container: {
      padding: 20,
      backgroundColor: theme === 'dark' ? '#121212' : '#fff',
      flexGrow: 1,
    },
    title: {
      fontSize: 28,
      fontWeight: 'bold',
      textAlign: 'center',
      color: theme === 'dark' ? '#fff' : '#000',
      marginBottom: 20,
    },
    input: {
      borderWidth: 1,
      borderColor: '#ccc',
      padding: 10,
      marginBottom: 10,
      borderRadius: 8,
      color: theme === 'dark' ? '#fff' : '#000',
    },
    weatherContainer: {
      alignItems: 'center',
      marginVertical: 20,
    },
    cityName: {
      fontSize: 22,
      fontWeight: 'bold',
      color: theme === 'dark' ? '#fff' : '#000',
    },
    temp: {
      fontSize: 32,
      color: theme === 'dark' ? '#fff' : '#000',
    },
    description: {
      fontSize: 16,
      textTransform: 'capitalize',
      color: theme === 'dark' ? '#ccc' : '#444',
    },
    error: {
      color: 'red',
      textAlign: 'center',
      marginTop: 10,
    },
    subtitle: {
      fontSize: 20,
      fontWeight: '600',
      marginTop: 20,
      color: theme === 'dark' ? '#fff' : '#000',
    },
    forecastContainer: {
      marginTop: 10,
      marginBottom: 30,
    },
    forecastItem: {
      alignItems: 'center',
      paddingHorizontal: 10,
    },
  });

