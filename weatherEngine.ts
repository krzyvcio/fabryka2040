// weatherEngine.ts – Dynamic environmental impact system

export type WeatherType = 'sunny' | 'rainy' | 'foggy' | 'stormy' | 'snowy';

export interface WeatherEvent {
  type: WeatherType;
  temperature: number;
  windSpeed: number;
  precipitation: number;
  electromagnticInterference: number;
  conflictImpact: number;
  timestamp: number;
  description: string;
}

export class WeatherEngine {
  private lastWeather: WeatherEvent | null = null;
  private weatherHistory: WeatherEvent[] = [];
  private baseTemp = 5;

  generateDailyWeather(): WeatherEvent {
    const roll = Math.random() * 100;
    let weather: any;

    if (roll <= 20) weather = this.generateSunnyWeather();
    else if (roll <= 45) weather = this.generateRainyWeather();
    else if (roll <= 70) weather = this.generateFoggyWeather();
    else if (roll <= 90) weather = this.generateStormyWeather();
    else weather = this.generateSnowyWeather();

    const event: WeatherEvent = {
      type: weather.type,
      temperature: weather.temperature,
      windSpeed: weather.windSpeed,
      precipitation: weather.precipitation,
      electromagnticInterference: weather.electromagnticInterference,
      conflictImpact: weather.conflictImpact,
      timestamp: Date.now(),
      description: weather.description,
    };

    this.lastWeather = event;
    this.weatherHistory.push(event);
    return event;
  }

  private generateSunnyWeather() {
    return {
      type: 'sunny',
      temperature: this.baseTemp + Math.random() * 5,
      windSpeed: 5 + Math.random() * 10,
      precipitation: 0,
      electromagnticInterference: 0.05,
      conflictImpact: -0.05,
      description: 'Clear skies. System stable.',
    };
  }

  private generateRainyWeather() {
    return {
      type: 'rainy',
      temperature: this.baseTemp - 2 + Math.random() * 5,
      windSpeed: 15 + Math.random() * 15,
      precipitation: 5 + Math.random() * 15,
      electromagnticInterference: 0.15,
      conflictImpact: 0.05,
      description: 'Rain detected. Minor EM fluctuations.',
    };
  }

  private generateFoggyWeather() {
    return {
      type: 'foggy',
      temperature: this.baseTemp - 3 + Math.random() * 4,
      windSpeed: 8 + Math.random() * 12,
      precipitation: 0.5,
      electromagnticInterference: 0.20,
      conflictImpact: 0.03,
      description: 'Fog reduces visibility. Sensors less reliable.',
    };
  }

  private generateStormyWeather() {
    return {
      type: 'stormy',
      temperature: this.baseTemp - 5 + Math.random() * 8,
      windSpeed: 40 + Math.random() * 30,
      precipitation: 20 + Math.random() * 40,
      electromagnticInterference: 0.45,
      conflictImpact: 0.15,
      description: 'Severe storm. High EM interference. System stress.',
    };
  }

  private generateSnowyWeather() {
    return {
      type: 'snowy',
      temperature: this.baseTemp - 8 + Math.random() * 4,
      windSpeed: 25 + Math.random() * 20,
      precipitation: 10 + Math.random() * 20,
      electromagnticInterference: 0.35,
      conflictImpact: 0.08,
      description: 'Blizzard conditions. Electrical instability.',
    };
  }

  getCurrentWeatherImpact() {
    if (!this.lastWeather) return { conflictDelta: 0, stabilityDelta: 0, emInterfernece: 0 };

    return {
      conflictDelta: this.lastWeather.conflictImpact,
      stabilityDelta: -this.lastWeather.electromagnticInterference * 0.3,
      emInterfernece: this.lastWeather.electromagnticInterference,
    };
  }

  getWeatherHistory() {
    return this.weatherHistory;
  }

  formatWeatherReport(weather: WeatherEvent): string {
    return `[${weather.type.toUpperCase()}] Temp: ${weather.temperature.toFixed(1)}C | Wind: ${weather.windSpeed.toFixed(1)}km/h | EM: ${(weather.electromagnticInterference * 100).toFixed(0)}%`;
  }
}

export function createWeatherEngine(): WeatherEngine {
  return new WeatherEngine();
}
