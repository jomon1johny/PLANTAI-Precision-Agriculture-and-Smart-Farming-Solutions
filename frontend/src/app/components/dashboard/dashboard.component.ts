import { Component, OnInit } from '@angular/core';
import { ApiService, DashboardStats } from '../../services/api.service';

@Component({
  selector: 'app-dashboard',
  template: `
    <div class="dashboard-container animate-slide-up">
      <!-- Title Header -->
      <div class="dashboard-header">
        <div>
          <h1 class="gradient-text">Agricultural Intelligence Terminal</h1>
          <p>Real-time analysis of crop vitals, anomaly detections, and diagnostic logs.</p>
        </div>
        <a routerLink="/scan" class="btn btn-primary">
          <span>🌿 New Leaf Scan</span>
        </a>
      </div>

      <!-- Stats Grid -->
      <div class="stats-grid" *ngIf="stats">
        <div class="stat-card glass-panel">
          <div class="stat-icon primary-icon">📊</div>
          <div class="stat-content">
            <span class="stat-label">Total Diagnostics</span>
            <span class="stat-value">{{ stats.total_scans }}</span>
          </div>
        </div>
        <div class="stat-card glass-panel">
          <div class="stat-icon" [ngClass]="getHealthColorClass(stats.average_health)">
            {{ getHealthEmoji(stats.average_health) }}
          </div>
          <div class="stat-content">
            <span class="stat-label">Average Crop Health</span>
            <span class="stat-value">{{ stats.average_health }}%</span>
          </div>
        </div>
        <div class="stat-card glass-panel">
          <div class="stat-icon danger-icon">⚠️</div>
          <div class="stat-content">
            <span class="stat-label">Active Pathogens</span>
            <span class="stat-value">{{ stats.active_diseases_count }}</span>
          </div>
        </div>
      </div>

      <!-- Charts & Insights Section -->
      <div class="insights-grid" *ngIf="stats && stats.total_scans > 0">
        <!-- SVG Trend Chart -->
        <div class="chart-card glass-panel">
          <h3 class="card-title">Crop Vitals Trend (Last 10 Scans)</h3>
          <div class="chart-container">
            <svg viewBox="0 0 500 200" class="trend-chart" *ngIf="stats.recent_trends.length > 1">
              <defs>
                <linearGradient id="chartGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stop-color="hsl(var(--primary-light))" stop-opacity="0.3"></stop>
                  <stop offset="100%" stop-color="hsl(var(--primary))" stop-opacity="0"></stop>
                </linearGradient>
              </defs>
              <!-- Grid lines -->
              <line x1="30" y1="40" x2="480" y2="40" stroke="rgba(255,255,255,0.05)" stroke-width="1" />
              <line x1="30" y1="110" x2="480" y2="110" stroke="rgba(255,255,255,0.05)" stroke-width="1" />
              <line x1="30" y1="180" x2="480" y2="180" stroke="rgba(255,255,255,0.1)" stroke-width="1" />
              
              <!-- Area under the line -->
              <path [attr.d]="chartAreaPath" fill="url(#chartGrad)"></path>
              
              <!-- Trend Line -->
              <path [attr.d]="chartLinePath" fill="none" stroke="hsl(var(--primary-light))" stroke-width="3" stroke-linecap="round"></path>
              
              <!-- Points -->
              <g *ngFor="let pt of chartPoints; let i = index">
                <circle [attr.cx]="pt.x" [attr.cy]="pt.y" r="5" class="chart-dot" [attr.fill]="pt.color" [attr.stroke]="'#0d1117'" stroke-width="2"></circle>
                <!-- Tooltip values -->
                <text [attr.x]="pt.x" [attr.y]="pt.y - 12" class="chart-text" text-anchor="middle">{{ pt.val }}%</text>
              </g>
            </svg>
            <div class="chart-fallback" *ngIf="stats.recent_trends.length <= 1">
              <p>Insufficient history data to map trends. Upload more leaf images.</p>
            </div>
          </div>
          <!-- Legend -->
          <div class="chart-legend" *ngIf="stats.recent_trends.length > 1">
            <span class="legend-item"><span class="legend-color primary-color"></span> Crop Health %</span>
            <span class="legend-item timeline-indicator">Chronological order (left to right)</span>
          </div>
        </div>

        <!-- Pathology Distribution -->
        <div class="pathology-card glass-panel">
          <h3 class="card-title">Pathogen Distribution</h3>
          <div class="disease-list">
            <div class="disease-item" *ngFor="let dis of stats.disease_distribution">
              <div class="disease-info">
                <span class="disease-name">{{ dis.disease_name }}</span>
                <span class="disease-count">{{ dis.count }} case(s)</span>
              </div>
              <div class="progress-bar-bg">
                <div class="progress-bar-fill" [style.width.%]="(dis.count / stats.total_scans) * 100"></div>
              </div>
            </div>
            <div class="no-pathogen-data" *ngIf="stats.disease_distribution.length === 0">
              <span class="healthy-badge">🎉 100% Healthy Crops</span>
              <p>No active pathogens detected in recent scans.</p>
            </div>
          </div>
        </div>
      </div>

      <!-- Recent Operations -->
      <div class="recent-scans-section glass-panel" *ngIf="stats && stats.recent_trends.length > 0">
        <h3 class="card-title">Recent Diagnoses Log</h3>
        <div class="scan-grid">
          <div class="scan-mini-card" *ngFor="let scan of stats.recent_trends.slice(0, 4)" [routerLink]="['/history']" [queryParams]="{search: scan.disease_name}">
            <div class="scan-mini-header">
              <span class="crop-badge">{{ scan.crop_type | uppercase }}</span>
              <span class="time-stamp">{{ formatTime(scan.timestamp) }}</span>
            </div>
            <h4 class="scan-mini-title">{{ scan.disease_name }}</h4>
            <div class="scan-mini-footer">
              <span class="health-label">Health Status:</span>
              <span class="health-val" [ngClass]="getHealthColorClass(scan.health_percentage)">{{ scan.health_percentage }}%</span>
            </div>
          </div>
        </div>
      </div>

      <!-- No Scan Data Welcome Dashboard -->
      <div class="welcome-card glass-panel" *ngIf="!stats || stats.total_scans === 0">
        <div class="welcome-emoji">🚜</div>
        <h2>Welcome to PLANTAI</h2>
        <p>Your AI-Powered Plant Disease Detection and Crop Health Monitoring System is online.</p>
        <p class="welcome-instruction">Begin by uploading a picture of your crop leaves in the Scan module to analyze anomalies, detect localized spots, and generate treatment workflows.</p>
        <a routerLink="/scan" class="btn btn-primary">
          <span>🌿 Get Started & Scan Leaf</span>
        </a>
      </div>
    </div>
  `,
  styles: [`
    .dashboard-container {
      max-width: 1200px;
      margin: 40px auto;
      padding: 0 24px;
      display: flex;
      flex-direction: column;
      gap: 32px;
    }
    .dashboard-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 20px;
    }
    .dashboard-header h1 {
      font-size: 2.2rem;
      margin-bottom: 6px;
    }
    .stats-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
      gap: 24px;
    }
    .stat-card {
      display: flex;
      align-items: center;
      gap: 20px;
      padding: 24px;
      transition: var(--transition-normal);
    }
    .stat-card:hover {
      transform: translateY(-4px);
      background-color: hsl(var(--bg-card-hover));
    }
    .stat-icon {
      width: 60px;
      height: 60px;
      border-radius: 12px;
      background-color: rgba(255,255,255,0.05);
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 2rem;
      border: 1px solid var(--border-light);
    }
    .primary-icon {
      background-color: var(--primary-glow);
      color: hsl(var(--primary-light));
      border-color: rgba(16, 185, 129, 0.2);
    }
    .health-high {
      background-color: var(--primary-glow);
      color: hsl(var(--primary-light));
      border-color: rgba(16, 185, 129, 0.2);
    }
    .health-med {
      background-color: var(--warning-glow);
      color: hsl(var(--warning));
      border-color: rgba(245, 158, 11, 0.2);
    }
    .health-low {
      background-color: var(--danger-glow);
      color: hsl(var(--danger));
      border-color: rgba(239, 68, 68, 0.2);
    }
    .danger-icon {
      background-color: var(--danger-glow);
      color: hsl(var(--danger));
      border-color: rgba(239, 68, 68, 0.2);
    }
    .stat-content {
      display: flex;
      flex-direction: column;
    }
    .stat-label {
      font-size: 0.85rem;
      font-family: var(--font-display);
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: hsl(var(--text-secondary));
    }
    .stat-value {
      font-size: 1.8rem;
      font-weight: 800;
      font-family: var(--font-display);
    }

    .insights-grid {
      display: grid;
      grid-template-columns: 2fr 1fr;
      gap: 24px;
    }
    @media (max-width: 992px) {
      .insights-grid {
        grid-template-columns: 1fr;
      }
    }
    .card-title {
      font-size: 1.15rem;
      margin-bottom: 20px;
      font-family: var(--font-display);
      border-bottom: 1px solid var(--border-light);
      padding-bottom: 12px;
    }
    .chart-card, .pathology-card, .recent-scans-section {
      padding: 24px;
    }
    .chart-container {
      width: 100%;
      min-height: 200px;
    }
    .trend-chart {
      width: 100%;
      height: 100%;
      overflow: visible;
    }
    .chart-dot {
      transition: var(--transition-fast);
      cursor: pointer;
    }
    .chart-dot:hover {
      r: 7;
    }
    .chart-text {
      fill: hsl(var(--text-primary));
      font-size: 8px;
      font-family: var(--font-display);
      font-weight: 600;
      pointer-events: none;
      opacity: 0.8;
    }
    .chart-legend {
      margin-top: 16px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 0.8rem;
      color: hsl(var(--text-secondary));
    }
    .legend-item {
      display: inline-flex;
      align-items: center;
      gap: 8px;
    }
    .legend-color {
      width: 12px;
      height: 12px;
      border-radius: 3px;
    }
    .primary-color {
      background-color: hsl(var(--primary-light));
    }
    .timeline-indicator {
      font-style: italic;
      color: hsl(var(--text-muted));
    }

    /* Pathology bar chart list */
    .disease-list {
      display: flex;
      flex-direction: column;
      gap: 16px;
    }
    .disease-item {
      display: flex;
      flex-direction: column;
      gap: 6px;
    }
    .disease-info {
      display: flex;
      justify-content: space-between;
      font-size: 0.9rem;
    }
    .disease-name {
      color: hsl(var(--text-primary));
      font-weight: 500;
    }
    .disease-count {
      color: hsl(var(--text-secondary));
    }
    .progress-bar-bg {
      height: 6px;
      background-color: rgba(255,255,255,0.05);
      border-radius: 3px;
      overflow: hidden;
    }
    .progress-bar-fill {
      height: 100%;
      background: linear-gradient(90deg, hsl(var(--primary-light)) 0%, hsl(var(--info)) 100%);
      border-radius: 3px;
    }
    .healthy-badge {
      display: inline-block;
      padding: 4px 12px;
      border-radius: 20px;
      background-color: var(--primary-glow);
      color: hsl(var(--primary-light));
      border: 1px solid rgba(16, 185, 129, 0.2);
      font-weight: 600;
      font-size: 0.85rem;
      margin-bottom: 12px;
    }
    .no-pathogen-data {
      text-align: center;
      padding: 40px 0;
    }

    /* Recent Scans Layout */
    .scan-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(230px, 1fr));
      gap: 20px;
    }
    .scan-mini-card {
      background-color: rgba(255,255,255,0.02);
      border: 1px solid var(--border-light);
      border-radius: 12px;
      padding: 16px;
      display: flex;
      flex-direction: column;
      gap: 12px;
      cursor: pointer;
      transition: var(--transition-normal);
    }
    .scan-mini-card:hover {
      background-color: hsl(var(--bg-card-hover));
      border-color: hsl(var(--primary));
      transform: translateY(-2px);
    }
    .scan-mini-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .crop-badge {
      font-size: 0.75rem;
      font-weight: 700;
      padding: 2px 8px;
      border-radius: 4px;
      background-color: rgba(255,255,255,0.08);
      color: hsl(var(--text-primary));
    }
    .time-stamp {
      font-size: 0.75rem;
      color: hsl(var(--text-muted));
    }
    .scan-mini-title {
      font-size: 0.95rem;
      font-weight: 600;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .scan-mini-footer {
      display: flex;
      justify-content: space-between;
      font-size: 0.85rem;
      border-top: 1px solid rgba(255,255,255,0.04);
      padding-top: 8px;
    }
    .health-label {
      color: hsl(var(--text-secondary));
    }
    .health-val {
      font-weight: 700;
    }
    .health-val.health-high {
      color: hsl(var(--primary-light));
    }
    .health-val.health-med {
      color: hsl(var(--warning));
    }
    .health-val.health-low {
      color: hsl(var(--danger));
    }

    /* Welcome Card Styling */
    .welcome-card {
      padding: 60px 40px;
      text-align: center;
      max-width: 600px;
      margin: 40px auto;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 16px;
    }
    .welcome-emoji {
      font-size: 4rem;
    }
    .welcome-card h2 {
      font-size: 1.8rem;
    }
    .welcome-instruction {
      margin-bottom: 12px;
    }

    @media (max-width: 768px) {
      .dashboard-header {
        flex-direction: column;
        align-items: flex-start;
      }
      .dashboard-header a {
        width: 100%;
      }
    }
  `]
})
export class DashboardComponent implements OnInit {
  stats: DashboardStats | null = null;
  
  // Custom SVG Paths
  chartLinePath = '';
  chartAreaPath = '';
  chartPoints: { x: number; y: number; val: number; color: string }[] = [];

  constructor(private apiService: ApiService) {}

  ngOnInit(): void {
    this.apiService.getStats().subscribe({
      next: (data) => {
        this.stats = data;
        if (data.recent_trends && data.recent_trends.length > 1) {
          this.buildChartPaths(data.recent_trends);
        }
      },
      error: (err) => console.error('Error fetching dashboard stats', err)
    });
  }

  buildChartPaths(trends: any[]): void {
    const totalPoints = trends.length;
    const paddingLeft = 35;
    const paddingRight = 35;
    const width = 500;
    const height = 200;
    const graphWidth = width - paddingLeft - paddingRight;
    const bottomY = 175;
    const topY = 35;
    const graphHeight = bottomY - topY;

    this.chartPoints = [];
    let pathSegments = [];

    for (let i = 0; i < totalPoints; i++) {
      const scan = trends[i];
      const percent = scan.health_percentage;

      // X coordinate spaced evenly
      const x = paddingLeft + (i * (graphWidth / (totalPoints - 1)));
      // Y coordinate: 100% is topY, 0% is bottomY
      const y = bottomY - (percent / 100) * graphHeight;

      // Color mapping based on health status
      let color = 'hsl(var(--primary-light))';
      if (percent < 55) {
        color = 'hsl(var(--danger))';
      } else if (percent < 75) {
        color = 'hsl(var(--warning))';
      }

      this.chartPoints.push({ x: Math.round(x), y: Math.round(y), val: Math.round(percent), color });
      pathSegments.push(`${Math.round(x)},${Math.round(y)}`);
    }

    if (pathSegments.length > 0) {
      this.chartLinePath = `M ${pathSegments.join(' L ')}`;
      
      // Close path to draw filled gradient area
      const firstX = this.chartPoints[0].x;
      const lastX = this.chartPoints[this.chartPoints.length - 1].x;
      this.chartAreaPath = `M ${firstX},${bottomY} L ${pathSegments.join(' L ')} L ${lastX},${bottomY} Z`;
    }
  }

  getHealthColorClass(health: number): string {
    if (health >= 90) return 'health-high';
    if (health >= 70) return 'health-med';
    return 'health-low';
  }

  getHealthEmoji(health: number): string {
    if (health >= 90) return '🌿';
    if (health >= 70) return '🍂';
    return '🥀';
  }

  formatTime(isoString: string): string {
    const d = new Date(isoString);
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) + ' ' + 
           d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit', hour12: false });
  }
}
