import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface InfectedRegion {
  id?: number;
  disease_name: string;
  x_min: number;
  y_min: number;
  width: number;
  height: number;
}

export interface ScanRecord {
  id: number;
  image: string;
  timestamp: string;
  crop_type: string;
  disease_name: string;
  severity: string;
  health_percentage: number;
  confidence_score: number;
  recommendation: string;
  infected_regions: InfectedRegion[];
}

export interface DashboardStats {
  total_scans: number;
  average_health: number;
  active_diseases_count: number;
  crop_distribution: { crop_type: string; count: number }[];
  disease_distribution: { disease_name: string; count: number }[];
  recent_trends: {
    id: number;
    timestamp: string;
    crop_type: string;
    disease_name: string;
    health_percentage: number;
  }[];
}

@Injectable({
  providedIn: 'root'
})
export class ApiService {
  private baseUrl = 'http://localhost:8000/api';

  constructor(private http: HttpClient) {}

  getStats(): Observable<DashboardStats> {
    return this.http.get<DashboardStats>(`${this.baseUrl}/dashboard/stats/`);
  }

  getHistory(filters?: { crop_type?: string; severity?: string; search?: string }): Observable<ScanRecord[]> {
    let params = new HttpParams();
    if (filters) {
      if (filters.crop_type) params = params.set('crop_type', filters.crop_type);
      if (filters.severity) params = params.set('severity', filters.severity);
      if (filters.search) params = params.set('search', filters.search);
    }
    return this.http.get<ScanRecord[]>(`${this.baseUrl}/scans/history/`, { params });
  }

  uploadScan(image: File, cropType: string): Observable<ScanRecord> {
    const formData = new FormData();
    formData.append('image', image);
    formData.append('crop_type', cropType);
    return this.http.post<ScanRecord>(`${this.baseUrl}/scans/upload/`, formData);
  }

  deleteScan(id: number): Observable<any> {
    return this.http.delete(`${this.baseUrl}/scans/history/${id}/`);
  }
}
