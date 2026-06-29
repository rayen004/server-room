export interface SensorRecord {
  id?: number;
  temperature: number;
  humidity: number;
  power: number;
  timestamp?: string;
  created_at?: string;
}

export interface AlertRecord {
  id: number;
  alert_type: "TEMPERATURE" | "HUMIDITY";
  message: string;
  temperature: number;
  humidity: number;
  threshold: number;
  email_sent: boolean;
  sms_sent: boolean;
  created_at: string;
}

export interface SensorPoint {
  time: string;
  temperature: number;
  humidity: number;
  power: number;
}

export interface MetricHistoryPoint {
  time: string;
  value: number;
}
