import { HttpClient } from "@angular/common/http";
import { Injectable } from "@angular/core";
import { Observable } from "rxjs";

import { AlertRecord, SensorRecord } from "../models/sensor.models";

@Injectable({ providedIn: "root" })
export class SensorApiService {
  constructor(private readonly http: HttpClient) {}

  fetchLatestSensorData(): Observable<SensorRecord> {
    return this.http.get<SensorRecord>("/api/sensor-data/");
  }

  fetchLatestAlert(): Observable<AlertRecord> {
    return this.http.get<AlertRecord>("/api/alerts/latest/");
  }

  sendSensorData(payload: SensorRecord): Observable<SensorRecord> {
    return this.http.post<SensorRecord>("/api/sensor-data/", payload);
  }
}
