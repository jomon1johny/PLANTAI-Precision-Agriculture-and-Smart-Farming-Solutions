import { Component, OnInit } from '@angular/core';
import { ApiService, ScanRecord } from '../../services/api.service';

@Component({
  selector: 'app-history',
  template: `
    <div class="history-container animate-slide-up">
      <!-- Header -->
      <div class="history-header">
        <h1 class="gradient-text">Historical Diagnostic Logs</h1>
        <p>Browse, query, and audit previously logged crop health records.</p>
      </div>

      <!-- Filters & Search Toolbar -->
      <div class="toolbar glass-panel">
        <div class="search-box">
          <span class="search-icon">🔍</span>
          <input type="text" 
                 class="form-input" 
                 placeholder="Search pathogens, diagnostics, or remediation..." 
                 [(ngModel)]="searchQuery" 
                 (keyup)="applyFilters()">
        </div>

        <div class="filters-row">
          <div class="filter-group">
            <select class="form-select" [(ngModel)]="filterCrop" (change)="applyFilters()">
              <option value="">All Crop Types</option>
              <option value="tomato">Tomato</option>
              <option value="apple">Apple</option>
              <option value="grape">Grape</option>
              <option value="potato">Potato</option>
              <option value="other">Other</option>
            </select>
          </div>

          <div class="filter-group">
            <select class="form-select" [(ngModel)]="filterSeverity" (change)="applyFilters()">
              <option value="">All Severities</option>
              <option value="Healthy">Healthy</option>
              <option value="Low">Low Severity</option>
              <option value="Medium">Medium Severity</option>
              <option value="High">High Severity</option>
            </select>
          </div>
        </div>
      </div>

      <!-- Records List -->
      <div class="records-workspace">
        <div class="loading-state" *ngIf="isLoading">
          <div class="spinner-large"></div>
          <p>Retrieving diagnostic records from server...</p>
        </div>

        <div class="empty-state glass-panel" *ngIf="!isLoading && records.length === 0">
          <div class="empty-icon">🗂️</div>
          <h3>No Diagnostic Records Found</h3>
          <p>No scans match your search query or filters. Clear filters or upload a new scan.</p>
          <button class="btn btn-primary mt-3" (click)="clearFilters()">Reset Filters</button>
        </div>

        <div class="records-grid" *ngIf="!isLoading && records.length > 0">
          <div class="record-card glass-panel" *ngFor="let rec of records" [class.expanded]="expandedCardId === rec.id">
            <!-- Normal Header View -->
            <div class="card-summary" (click)="toggleExpand(rec.id)">
              <div class="thumbnail-wrapper">
                <img [src]="'http://localhost:8000' + rec.image" alt="Leaf Thumbnail">
              </div>
              <div class="card-main-info">
                <div class="card-meta">
                  <span class="crop-badge">{{ rec.crop_type | uppercase }}</span>
                  <span class="timestamp">{{ formatTime(rec.timestamp) }}</span>
                </div>
                <h3 class="disease-name">{{ rec.disease_name }}</h3>
                <div class="card-quick-metrics">
                  <span class="quick-metric">Health Index: <strong [ngClass]="getHealthColorClass(rec.health_percentage)">{{ rec.health_percentage }}%</strong></span>
                  <span class="quick-metric">Severity: <strong class="badge-tag-mini" [ngClass]="getSeverityClass(rec.severity)">{{ rec.severity }}</strong></span>
                </div>
              </div>
              <div class="card-chevron" [class.rotated]="expandedCardId === rec.id">▼</div>
            </div>

            <!-- Expanded Details View -->
            <div class="card-details" *ngIf="expandedCardId === rec.id">
              <div class="details-divider"></div>
              
              <div class="details-layout">
                <!-- Highlighted Image Overlay -->
                <div class="expanded-image-wrapper">
                  <div class="relative-img-container">
                    <img [src]="'http://localhost:8000' + rec.image" alt="Leaf Detailed Image">
                    <div class="bounding-box-mini"
                         *ngFor="let box of rec.infected_regions"
                         [style.left.%]="box.x_min * 100"
                         [style.top.%]="box.y_min * 100"
                         [style.width.%]="box.width * 100"
                         [style.height.%]="box.height * 100"
                         [ngClass]="getSeverityClass(rec.severity)">
                      <span class="box-label-mini">{{ box.disease_name }}</span>
                    </div>
                  </div>
                </div>

                <!-- Descriptive Metadata -->
                <div class="expanded-info-container">
                  <div class="info-group">
                    <h4>Diagnosed Disease</h4>
                    <p class="disease-title-large">{{ rec.disease_name }}</p>
                  </div>
                  
                  <div class="info-group">
                    <h4>Remediation Protocol</h4>
                    <div class="recommendation-box">
                      <p>{{ rec.recommendation }}</p>
                    </div>
                  </div>

                  <div class="info-group border-none">
                    <h4>Diagnostic Metadata</h4>
                    <div class="metadata-grid">
                      <div><span>Confidence Score:</span> <strong>{{ (rec.confidence_score * 100) | number:'1.0-0' }}%</strong></div>
                      <div><span>Spots Detected:</span> <strong>{{ rec.infected_regions.length }}</strong></div>
                      <div><span>Database Identifier:</span> <strong>#SR-{{ rec.id }}</strong></div>
                    </div>
                  </div>

                  <!-- Danger Actions -->
                  <div class="expanded-actions">
                    <button class="btn btn-danger" (click)="deleteRecord(rec.id, $event)">🗑️ Delete Diagnostic Log</button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .history-container {
      max-width: 1200px;
      margin: 40px auto;
      padding: 0 24px;
      display: flex;
      flex-direction: column;
      gap: 32px;
    }
    .history-header h1 {
      font-size: 2.2rem;
      margin-bottom: 6px;
    }

    /* Toolbar filtering */
    .toolbar {
      padding: 20px;
      display: flex;
      flex-direction: column;
      gap: 16px;
    }
    .search-box {
      position: relative;
      width: 100%;
    }
    .search-icon {
      position: absolute;
      left: 16px;
      top: 50%;
      transform: translateY(-50%);
      font-size: 1.1rem;
      color: hsl(var(--text-muted));
    }
    .search-box .form-input {
      padding-left: 48px;
    }
    .filters-row {
      display: flex;
      gap: 16px;
    }
    .filter-group {
      flex: 1;
    }

    @media (min-width: 768px) {
      .toolbar {
        flex-direction: row;
        align-items: center;
        justify-content: space-between;
      }
      .search-box {
        max-width: 500px;
      }
      .filters-row {
        width: auto;
        min-width: 350px;
      }
    }

    /* Records List styles */
    .records-workspace {
      width: 100%;
    }
    .loading-state {
      text-align: center;
      padding: 60px 0;
      color: hsl(var(--text-secondary));
    }
    .spinner-large {
      width: 40px;
      height: 40px;
      border: 3px solid rgba(255,255,255,0.1);
      border-radius: 50%;
      border-top-color: hsl(var(--primary));
      animation: spin 0.8s linear infinite;
      margin: 0 auto 16px;
    }
    @keyframes spin {
      to { transform: rotate(360deg); }
    }

    .empty-state {
      text-align: center;
      padding: 50px 20px;
      max-width: 500px;
      margin: 0 auto;
    }
    .empty-icon {
      font-size: 3rem;
      margin-bottom: 16px;
    }
    .mt-3 {
      margin-top: 12px;
    }

    .records-grid {
      display: flex;
      flex-direction: column;
      gap: 16px;
    }

    /* Record Card layout */
    .record-card {
      transition: var(--transition-normal);
      overflow: hidden;
    }
    .record-card:hover {
      background-color: hsl(var(--bg-card-hover));
    }
    .card-summary {
      display: flex;
      align-items: center;
      gap: 20px;
      padding: 16px 24px;
      cursor: pointer;
      user-select: none;
    }
    .thumbnail-wrapper {
      width: 60px;
      height: 60px;
      border-radius: 8px;
      overflow: hidden;
      border: 1px solid var(--border-light);
      flex-shrink: 0;
      background-color: #000;
    }
    .thumbnail-wrapper img {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }
    .card-main-info {
      flex-grow: 1;
      display: flex;
      flex-direction: column;
      gap: 4px;
    }
    .card-meta {
      display: flex;
      align-items: center;
      gap: 12px;
    }
    .crop-badge {
      font-size: 0.7rem;
      font-weight: 700;
      padding: 2px 6px;
      border-radius: 4px;
      background-color: rgba(255,255,255,0.06);
      color: hsl(var(--text-secondary));
    }
    .timestamp {
      font-size: 0.75rem;
      color: hsl(var(--text-muted));
    }
    .disease-name {
      font-size: 1.15rem;
      font-weight: 600;
    }
    .card-quick-metrics {
      display: flex;
      gap: 20px;
      font-size: 0.85rem;
    }
    .quick-metric {
      color: hsl(var(--text-secondary));
    }
    
    .health-high { color: hsl(var(--primary-light)); }
    .health-med { color: hsl(var(--warning)); }
    .health-low { color: hsl(var(--danger)); }

    .badge-tag-mini {
      font-size: 0.75rem;
      font-weight: 600;
      padding: 1px 8px;
      border-radius: 4px;
    }
    .badge-tag-mini.sev-healthy { background-color: var(--primary-glow); color: hsl(var(--primary-light)); }
    .badge-tag-mini.sev-low { background-color: var(--info-glow); color: hsl(var(--info)); }
    .badge-tag-mini.sev-medium { background-color: var(--warning-glow); color: hsl(var(--warning)); }
    .badge-tag-mini.sev-high { background-color: var(--danger-glow); color: hsl(var(--danger)); }
    
    .card-chevron {
      color: hsl(var(--text-muted));
      font-size: 0.8rem;
      transition: var(--transition-fast);
    }
    .card-chevron.rotated {
      transform: rotate(180deg);
      color: hsl(var(--primary-light));
    }

    /* Expanded Details area */
    .card-details {
      padding: 0 24px 24px;
      animation: fadeIn var(--transition-normal);
    }
    .details-divider {
      height: 1px;
      background-color: var(--border-light);
      margin-bottom: 20px;
    }
    .details-layout {
      display: grid;
      grid-template-columns: 300px 1fr;
      gap: 24px;
    }
    @media (max-width: 768px) {
      .details-layout {
        grid-template-columns: 1fr;
      }
    }
    .expanded-image-wrapper {
      width: 100%;
      border-radius: 8px;
      overflow: hidden;
      border: 1px solid var(--border-light);
      background-color: #000;
    }
    .relative-img-container {
      position: relative;
      width: 100%;
    }
    .relative-img-container img {
      width: 100%;
      display: block;
    }
    
    /* YOLO boxes in history list */
    .bounding-box-mini {
      position: absolute;
      border: 1.5px solid white;
      border-radius: 2px;
      box-shadow: 0 0 6px rgba(255,255,255,0.4);
    }
    .bounding-box-mini.sev-healthy { border-color: hsl(var(--primary-light)); }
    .bounding-box-mini.sev-low { border-color: hsl(var(--info)); }
    .bounding-box-mini.sev-medium { border-color: hsl(var(--warning)); }
    .bounding-box-mini.sev-high { border-color: hsl(var(--danger)); }

    .box-label-mini {
      position: absolute;
      top: -16px;
      left: -1px;
      font-size: 0.55rem;
      color: white;
      padding: 0px 4px;
      border-radius: 2px 2px 0 0;
      white-space: nowrap;
      pointer-events: none;
    }
    .sev-healthy .box-label-mini { background-color: hsl(var(--primary)); }
    .sev-low .box-label-mini { background-color: hsl(var(--info)); }
    .sev-medium .box-label-mini { background-color: hsl(var(--warning)); }
    .sev-high .box-label-mini { background-color: hsl(var(--danger)); }

    .expanded-info-container {
      display: flex;
      flex-direction: column;
      gap: 16px;
    }
    .info-group {
      border-bottom: 1px solid rgba(255,255,255,0.04);
      padding-bottom: 12px;
    }
    .border-none {
      border: none;
      padding-bottom: 0;
    }
    .info-group h4 {
      font-size: 0.75rem;
      color: hsl(var(--text-muted));
      text-transform: uppercase;
      margin-bottom: 6px;
      letter-spacing: 0.05em;
    }
    .disease-title-large {
      font-size: 1.3rem;
      font-weight: 700;
      color: hsl(var(--text-primary));
    }
    .recommendation-box {
      background-color: rgba(255,255,255,0.02);
      border: 1px solid var(--border-light);
      border-radius: 8px;
      padding: 12px;
    }
    .recommendation-box p {
      color: hsl(var(--text-primary));
      font-size: 0.9rem;
    }
    .metadata-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
      gap: 8px;
      font-size: 0.85rem;
    }
    .metadata-grid div span {
      color: hsl(var(--text-secondary));
    }

    .expanded-actions {
      display: flex;
      justify-content: flex-end;
      margin-top: 8px;
    }
  `]
})
export class HistoryComponent implements OnInit {
  records: ScanRecord[] = [];
  searchQuery = '';
  filterCrop = '';
  filterSeverity = '';
  isLoading = true;
  expandedCardId: number | null = null;

  constructor(private apiService: ApiService) {}

  ngOnInit(): void {
    this.fetchRecords();
  }

  fetchRecords(): void {
    this.isLoading = true;
    const filters = {
      crop_type: this.filterCrop,
      severity: this.filterSeverity,
      search: this.searchQuery
    };
    this.apiService.getHistory(filters).subscribe({
      next: (data) => {
        this.records = data;
        this.isLoading = false;
      },
      error: (err) => {
        console.error('Error fetching scan history', err);
        this.isLoading = false;
      }
    });
  }

  applyFilters(): void {
    this.fetchRecords();
  }

  clearFilters(): void {
    this.searchQuery = '';
    this.filterCrop = '';
    this.filterSeverity = '';
    this.fetchRecords();
  }

  toggleExpand(id: number): void {
    this.expandedCardId = this.expandedCardId === id ? null : id;
  }

  deleteRecord(id: number, event: MouseEvent): void {
    event.stopPropagation();
    if (confirm('Are you sure you want to delete this scan from history?')) {
      this.apiService.deleteScan(id).subscribe({
        next: () => {
          this.records = this.records.filter(r => r.id !== id);
          if (this.expandedCardId === id) {
            this.expandedCardId = null;
          }
        },
        error: (err) => console.error('Error deleting record', err)
      });
    }
  }

  formatTime(isoString: string): string {
    const d = new Date(isoString);
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) + ' ' + 
           d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit', hour12: false });
  }

  getHealthColorClass(health: number): string {
    if (health >= 90) return 'health-high';
    if (health >= 70) return 'health-med';
    return 'health-low';
  }

  getSeverityClass(severity: string): string {
    const s = severity.toLowerCase();
    if (s === 'healthy') return 'sev-healthy';
    if (s === 'low') return 'sev-low';
    if (s === 'medium') return 'sev-medium';
    return 'sev-high';
  }
}
