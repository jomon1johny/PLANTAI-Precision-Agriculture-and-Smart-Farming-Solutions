import { Component, ElementRef, ViewChild, OnDestroy } from '@angular/core';
import { ApiService, ScanRecord } from '../../services/api.service';

@Component({
  selector: 'app-scan',
  template: `
    <div class="scan-container animate-slide-up">
      <!-- Header -->
      <div class="scan-header">
        <h1 class="gradient-text">Crop Health Diagnostic Terminal</h1>
        <p>Upload a leaf photograph or capture a live frame to detect pathology patterns.</p>
      </div>

      <div class="scan-workspace">
        <!-- Control Panel (Upload/Camera) -->
        <div class="control-panel glass-panel" *ngIf="!scanResult">
          <!-- Error Alert Banner -->
          <div class="error-alert animate-fade-in" *ngIf="errorMessage">
            <div class="error-icon">⚠️</div>
            <div class="error-content">
              <h3>Diagnostic Error</h3>
              <p>{{ errorMessage }}</p>
            </div>
            <button class="close-error-btn" (click)="errorMessage = null">✕</button>
          </div>

          <!-- Crop Selection -->
          <div class="form-group">
            <label class="form-label">Target Crop Type</label>
            <select class="form-select" [(ngModel)]="selectedCrop">
              <option value="tomato">Tomato (Solanum lycopersicum)</option>
              <option value="apple">Apple (Malus domestica)</option>
              <option value="grape">Grape (Vitis vinifera)</option>
              <option value="potato">Potato (Solanum tuberosum)</option>
              <option value="other">Other / General Foliage</option>
            </select>
          </div>

          <!-- Tabs for Camera / File Upload -->
          <div class="mode-tabs">
            <button class="tab-btn" [class.active]="activeTab === 'upload'" (click)="setTab('upload')">📁 File Upload</button>
            <button class="tab-btn" [class.active]="activeTab === 'camera'" (click)="setTab('camera')">📷 Live Camera</button>
          </div>

          <!-- File Upload Mode -->
          <div *ngIf="activeTab === 'upload'" 
               class="drop-zone" 
               [class.drag-over]="isDragOver"
               (dragover)="onDragOver($event)"
               (dragleave)="onDragLeave($event)"
               (drop)="onDrop($event)"
               (click)="fileInput.click()">
            
            <input type="file" #fileInput (change)="onFileSelected($event)" accept="image/*" style="display: none;">
            
            <div class="drop-content" *ngIf="!selectedFile">
              <div class="drop-icon">📤</div>
              <h3>Drag & Drop Leaf Photograph</h3>
              <p>Supports PNG, JPG, JPEG up to 10MB</p>
              <button class="btn btn-secondary mt-3">Browse File System</button>
            </div>

            <div class="file-preview" *ngIf="selectedFile" (click)="$event.stopPropagation()">
              <div class="file-icon">📄</div>
              <div class="file-info">
                <span class="file-name">{{ selectedFile.name }}</span>
                <span class="file-size">{{ (selectedFile.size / 1024 / 1024) | number:'1.1-2' }} MB</span>
              </div>
              <button class="remove-btn" (click)="clearSelectedFile()">❌</button>
            </div>
          </div>

          <!-- Live Camera Mode -->
          <div *ngIf="activeTab === 'camera'" class="camera-zone">
            <!-- Camera Feed -->
            <div class="video-container" *ngIf="isCameraActive">
              <video #videoElement autoplay playsinline muted></video>
              <div class="camera-grid-overlay"></div>
            </div>

            <!-- Pre-Capture State -->
            <div class="camera-placeholder" *ngIf="!isCameraActive && !capturedImage">
              <div class="camera-icon">🎥</div>
              <h3>Webcam Feed Inactive</h3>
              <p>Grant camera permissions to capture leaves directly.</p>
              <button class="btn btn-primary" (click)="startCamera()">Activate Camera</button>
            </div>

            <!-- Post-Capture State -->
            <div class="captured-preview" *ngIf="capturedImage">
              <img [src]="capturedImage" alt="Captured Frame">
              <button class="remove-btn" (click)="clearCapturedImage()">❌ Retake</button>
            </div>

            <!-- Camera Controls -->
            <div class="camera-controls" *ngIf="isCameraActive">
              <button class="btn btn-primary" (click)="captureFrame()">📸 Capture Frame</button>
              <button class="btn btn-secondary" (click)="stopCamera()">Deactivate</button>
            </div>
          </div>

          <!-- Submit Button -->
          <button class="btn btn-primary btn-submit w-full mt-4" 
                  [disabled]="!canSubmit() || isAnalyzing" 
                  (click)="analyzeLeaf()">
            <span *ngIf="!isAnalyzing">🤖 Run Machine Learning Analysis</span>
            <span *ngIf="isAnalyzing" class="spinner-container">
              <span class="spinner"></span> Analyzing Pixels...
            </span>
          </button>
        </div>

        <!-- Result Display Panel -->
        <div class="result-panel glass-panel animate-fade-in" *ngIf="scanResult">
          <div class="result-grid">
            <!-- Image Overlay View (YOLO Box Overlay) -->
            <div class="image-viewer-container">
              <div class="image-overlay-wrapper">
                <img [src]="'http://localhost:8000' + scanResult.image" alt="Analyzed Leaf" #resultImageElement>
                
                <!-- Bounding Boxes Overlay -->
                <div class="bounding-box" 
                     *ngFor="let box of scanResult.infected_regions"
                     [style.left.%]="box.x_min * 100"
                     [style.top.%]="box.y_min * 100"
                     [style.width.%]="box.width * 100"
                     [style.height.%]="box.height * 100"
                     [ngClass]="getSeverityClass(scanResult.severity)">
                  <span class="box-label">{{ box.disease_name }}</span>
                </div>
              </div>
              <div class="image-legend">
                <span>🎯 Neural Network Bounding Boxes overlaid on detected infection spots.</span>
              </div>
            </div>

            <!-- Diagnostics Details -->
            <div class="details-container">
              <div class="crop-header-details">
                <span class="crop-badge">{{ scanResult.crop_type | uppercase }}</span>
                <span class="scan-id">ID: #SR-{{ scanResult.id }}</span>
              </div>

              <h2 class="disease-title">{{ scanResult.disease_name }}</h2>
              
              <!-- Metrics list -->
              <div class="metrics-row">
                <div class="metric-box">
                  <span class="label">Health Index</span>
                  <span class="value" [ngClass]="getHealthColorClass(scanResult.health_percentage)">{{ scanResult.health_percentage }}%</span>
                </div>
                <div class="metric-box">
                  <span class="label">Severity</span>
                  <span class="value badge-tag" [ngClass]="getSeverityClass(scanResult.severity)">{{ scanResult.severity }}</span>
                </div>
                <div class="metric-box">
                  <span class="label">Confidence</span>
                  <span class="value info-color">{{ (scanResult.confidence_score * 100) | number:'1.0-0' }}%</span>
                </div>
              </div>

              <!-- Recommendation Card -->
              <div class="recommendation-card">
                <h3>📋 Remediation Protocol</h3>
                <p>{{ scanResult.recommendation }}</p>
              </div>

              <div class="actions-row">
                <button class="btn btn-secondary" (click)="resetTerminal()">🌿 Scan Another Leaf</button>
                <button class="btn btn-primary" routerLink="/history">📚 History Log</button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .scan-container {
      max-width: 1200px;
      margin: 40px auto;
      padding: 0 24px;
      display: flex;
      flex-direction: column;
      gap: 32px;
    }
    .scan-header h1 {
      font-size: 2.2rem;
      margin-bottom: 6px;
    }
    .scan-workspace {
      width: 100%;
    }
    .control-panel {
      max-width: 650px;
      margin: 0 auto;
      padding: 32px;
    }
    .error-alert {
      display: flex;
      align-items: center;
      gap: 16px;
      padding: 16px 20px;
      border: 1px solid hsla(350, 80%, 52%, 0.25);
      border-radius: 12px;
      background: linear-gradient(135deg, hsla(350, 80%, 52%, 0.05) 0%, hsla(350, 80%, 52%, 0.1) 100%);
      margin-bottom: 24px;
      position: relative;
    }
    .error-icon {
      font-size: 1.8rem;
    }
    .error-content {
      flex-grow: 1;
    }
    .error-content h3 {
      font-size: 1.05rem;
      color: hsl(var(--danger));
      margin-bottom: 2px;
      font-family: var(--font-display);
      font-weight: 700;
    }
    .error-content p {
      font-size: 0.9rem;
      color: hsl(var(--text-primary));
      line-height: 1.4;
    }
    .close-error-btn {
      background: none;
      border: none;
      cursor: pointer;
      color: hsl(var(--text-muted));
      font-size: 1.1rem;
      padding: 4px;
      border-radius: 4px;
      transition: var(--transition-fast);
      align-self: flex-start;
      margin-top: -4px;
      margin-right: -4px;
    }
    .close-error-btn:hover {
      color: hsl(var(--text-primary));
      background-color: rgba(255, 255, 255, 0.05);
    }
    .w-full {
      width: 100%;
    }
    .mt-3 {
      margin-top: 12px;
    }
    .mt-4 {
      margin-top: 24px;
    }
    
    /* Tabs styling */
    .mode-tabs {
      display: flex;
      gap: 12px;
      margin-bottom: 20px;
      border-bottom: 1px solid var(--border-light);
      padding-bottom: 8px;
    }
    .tab-btn {
      flex: 1;
      padding: 10px;
      border: none;
      background: none;
      color: hsl(var(--text-secondary));
      font-family: var(--font-display);
      font-weight: 600;
      cursor: pointer;
      border-bottom: 2px solid transparent;
      transition: var(--transition-fast);
    }
    .tab-btn.active {
      color: hsl(var(--primary-light));
      border-bottom-color: hsl(var(--primary));
    }

    /* Drag and drop zone */
    .drop-zone {
      border: 2px dashed var(--border-light);
      border-radius: 16px;
      padding: 40px 20px;
      text-align: center;
      cursor: pointer;
      background-color: rgba(255,255,255,0.01);
      transition: var(--transition-normal);
      position: relative;
    }
    .drop-zone:hover, .drop-zone.drag-over {
      border-color: hsl(var(--primary));
      background-color: var(--primary-glow);
    }
    .drop-icon {
      font-size: 3rem;
      margin-bottom: 16px;
    }
    .drop-content h3 {
      font-size: 1.2rem;
      margin-bottom: 4px;
    }

    /* File preview */
    .file-preview {
      display: flex;
      align-items: center;
      gap: 16px;
      background-color: hsl(var(--bg-panel));
      border: 1px solid var(--border-light);
      border-radius: 12px;
      padding: 16px;
      text-align: left;
    }
    .file-icon {
      font-size: 2rem;
    }
    .file-info {
      display: flex;
      flex-direction: column;
      flex-grow: 1;
      overflow: hidden;
    }
    .file-name {
      font-weight: 600;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .file-size {
      font-size: 0.8rem;
      color: hsl(var(--text-secondary));
    }
    .remove-btn {
      background: none;
      border: none;
      cursor: pointer;
      font-size: 1rem;
      padding: 4px;
      border-radius: 4px;
      transition: var(--transition-fast);
    }
    .remove-btn:hover {
      background-color: rgba(255,255,255,0.1);
    }

    /* Camera Zone styling */
    .camera-zone {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 16px;
      border: 1px solid var(--border-light);
      border-radius: 16px;
      padding: 24px;
      background-color: rgba(0, 0, 0, 0.15);
    }
    .camera-placeholder {
      text-align: center;
      padding: 20px 0;
    }
    .camera-icon {
      font-size: 3rem;
      margin-bottom: 16px;
    }
    .video-container {
      position: relative;
      width: 100%;
      max-width: 480px;
      aspect-ratio: 4/3;
      border-radius: 12px;
      overflow: hidden;
      border: 1px solid hsl(var(--text-muted));
    }
    video {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }
    .camera-grid-overlay {
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: 
        linear-gradient(rgba(255,255,255,0.05) 33%, transparent 33%, transparent 66%, rgba(255,255,255,0.05) 66%),
        linear-gradient(90deg, rgba(255,255,255,0.05) 33%, transparent 33%, transparent 66%, rgba(255,255,255,0.05) 66%);
      pointer-events: none;
    }
    .captured-preview {
      position: relative;
      width: 100%;
      max-width: 480px;
      border-radius: 12px;
      overflow: hidden;
      border: 1px solid hsl(var(--primary-light));
    }
    .captured-preview img {
      width: 100%;
      display: block;
    }
    .captured-preview .remove-btn {
      position: absolute;
      top: 10px;
      right: 10px;
      background-color: rgba(0,0,0,0.6);
      color: white;
      padding: 6px 12px;
      border-radius: 20px;
    }
    .camera-controls {
      display: flex;
      gap: 12px;
    }

    /* Submit spinner */
    .spinner-container {
      display: inline-flex;
      align-items: center;
      gap: 8px;
    }
    .spinner {
      width: 16px;
      height: 16px;
      border: 2px solid rgba(255,255,255,0.3);
      border-radius: 50%;
      border-top-color: white;
      animation: spin 0.8s linear infinite;
    }
    @keyframes spin {
      to { transform: rotate(360deg); }
    }

    /* Results Panel styling */
    .result-panel {
      padding: 32px;
      width: 100%;
    }
    .result-grid {
      display: grid;
      grid-template-columns: 1.2fr 1fr;
      gap: 32px;
    }
    @media (max-width: 900px) {
      .result-grid {
        grid-template-columns: 1fr;
      }
    }

    /* Image Viewer & YOLO Bounding Box overlays */
    .image-viewer-container {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }
    .image-overlay-wrapper {
      position: relative;
      width: 100%;
      border-radius: 12px;
      overflow: hidden;
      border: 1px solid var(--border-light);
      box-shadow: var(--shadow-md);
      background-color: #000;
    }
    .image-overlay-wrapper img {
      width: 100%;
      display: block;
    }
    .bounding-box {
      position: absolute;
      border: 2px solid white;
      box-shadow: 0 0 12px rgba(255,255,255,0.4);
      border-radius: 4px;
      transition: var(--transition-fast);
    }
    .bounding-box:hover {
      box-shadow: 0 0 20px rgba(255,255,255,0.9);
      border-width: 3px;
    }
    .bounding-box.sev-healthy {
      border-color: hsl(var(--primary-light));
      box-shadow: 0 0 8px hsla(142, 70%, 45%, 0.5);
    }
    .bounding-box.sev-low {
      border-color: hsl(var(--info));
      box-shadow: 0 0 8px hsla(199, 89%, 48%, 0.5);
    }
    .bounding-box.sev-medium {
      border-color: hsl(var(--warning));
      box-shadow: 0 0 8px hsla(38, 90%, 55%, 0.5);
    }
    .bounding-box.sev-high {
      border-color: hsl(var(--danger));
      box-shadow: 0 0 8px hsla(350, 80%, 52%, 0.5);
    }
    .box-label {
      position: absolute;
      top: -24px;
      left: -2px;
      font-size: 0.75rem;
      font-family: var(--font-display);
      font-weight: 700;
      color: white;
      padding: 2px 8px;
      border-radius: 4px 4px 0 0;
      white-space: nowrap;
    }
    .sev-healthy .box-label { background-color: hsl(var(--primary)); }
    .sev-low .box-label { background-color: hsl(var(--info)); }
    .sev-medium .box-label { background-color: hsl(var(--warning)); }
    .sev-high .box-label { background-color: hsl(var(--danger)); }
    
    .image-legend {
      font-size: 0.8rem;
      color: hsl(var(--text-secondary));
      display: flex;
      align-items: center;
      gap: 6px;
    }

    /* Diagnostics details card */
    .details-container {
      display: flex;
      flex-direction: column;
      gap: 20px;
    }
    .crop-header-details {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .crop-badge {
      font-family: var(--font-display);
      font-weight: 700;
      font-size: 0.8rem;
      letter-spacing: 0.05em;
      padding: 4px 10px;
      border-radius: 6px;
      background-color: rgba(255,255,255,0.06);
      border: 1px solid var(--border-light);
    }
    .scan-id {
      font-size: 0.8rem;
      color: hsl(var(--text-muted));
      font-family: monospace;
    }
    .disease-title {
      font-size: 1.8rem;
    }
    .metrics-row {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 12px;
    }
    .metric-box {
      background-color: rgba(255,255,255,0.03);
      border: 1px solid var(--border-light);
      border-radius: 12px;
      padding: 12px;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 4px;
    }
    .metric-box .label {
      font-size: 0.75rem;
      color: hsl(var(--text-secondary));
      text-transform: uppercase;
      font-family: var(--font-display);
    }
    .metric-box .value {
      font-size: 1.25rem;
      font-weight: 800;
      font-family: var(--font-display);
    }
    
    .health-high { color: hsl(var(--primary-light)); }
    .health-med { color: hsl(var(--warning)); }
    .health-low { color: hsl(var(--danger)); }

    .badge-tag {
      padding: 2px 10px;
      border-radius: 6px;
      font-size: 0.85rem !important;
      font-weight: 600 !important;
    }
    .badge-tag.sev-healthy { background-color: var(--primary-glow); color: hsl(var(--primary-light)); }
    .badge-tag.sev-low { background-color: var(--info-glow); color: hsl(var(--info)); }
    .badge-tag.sev-medium { background-color: var(--warning-glow); color: hsl(var(--warning)); }
    .badge-tag.sev-high { background-color: var(--danger-glow); color: hsl(var(--danger)); }
    
    .info-color { color: hsl(var(--info)); }

    /* Recommendations block */
    .recommendation-card {
      background-color: rgba(16, 185, 129, 0.03);
      border: 1px solid rgba(16, 185, 129, 0.1);
      border-radius: 12px;
      padding: 20px;
      display: flex;
      flex-direction: column;
      gap: 8px;
    }
    .recommendation-card h3 {
      font-size: 1rem;
      color: hsl(var(--primary-light));
      display: flex;
      align-items: center;
      gap: 6px;
    }
    .recommendation-card p {
      font-size: 0.95rem;
      line-height: 1.5;
      color: hsl(var(--text-primary));
    }

    .actions-row {
      display: flex;
      gap: 16px;
      margin-top: 12px;
    }
    .actions-row button, .actions-row a {
      flex: 1;
    }
  `]
})
export class ScanComponent implements OnDestroy {
  @ViewChild('videoElement') videoElement!: ElementRef<HTMLVideoElement>;

  selectedCrop = 'tomato';
  activeTab: 'upload' | 'camera' = 'upload';
  
  // File Upload states
  selectedFile: File | null = null;
  isDragOver = false;

  // Camera states
  isCameraActive = false;
  cameraStream: MediaStream | null = null;
  capturedImage: string | null = null;
  capturedBlob: Blob | null = null;

  // API Call states
  isAnalyzing = false;
  scanResult: ScanRecord | null = null;
  errorMessage: string | null = null;

  constructor(private apiService: ApiService) {}

  ngOnDestroy(): void {
    this.stopCamera();
  }

  setTab(tab: 'upload' | 'camera'): void {
    this.activeTab = tab;
    if (tab !== 'camera') {
      this.stopCamera();
    }
  }

  // File Upload Handlers
  onFileSelected(event: any): void {
    const file = event.target.files[0];
    if (file) {
      this.selectedFile = file;
      this.errorMessage = null;
    }
  }

  onDragOver(event: DragEvent): void {
    event.preventDefault();
    this.isDragOver = true;
  }

  onDragLeave(event: DragEvent): void {
    event.preventDefault();
    this.isDragOver = false;
  }

  onDrop(event: DragEvent): void {
    event.preventDefault();
    this.isDragOver = false;
    const file = event.dataTransfer?.files[0];
    if (file && file.type.startsWith('image/')) {
      this.selectedFile = file;
      this.errorMessage = null;
    }
  }

  clearSelectedFile(): void {
    this.selectedFile = null;
  }

  // Camera Handlers
  startCamera(): void {
    this.clearCapturedImage();
    this.errorMessage = null;
    navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } })
      .then(stream => {
        this.isCameraActive = true;
        this.cameraStream = stream;
        setTimeout(() => {
          if (this.videoElement) {
            this.videoElement.nativeElement.srcObject = stream;
          }
        }, 100);
      })
      .catch(err => {
        console.error('Error accessing camera: ', err);
        alert('Could not access camera. Please check permissions or upload a file.');
      });
  }

  stopCamera(): void {
    if (this.cameraStream) {
      this.cameraStream.getTracks().forEach(track => track.stop());
      this.cameraStream = null;
    }
    this.isCameraActive = false;
  }

  captureFrame(): void {
    if (this.videoElement) {
      const video = this.videoElement.nativeElement;
      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth || 640;
      canvas.height = video.videoHeight || 480;
      
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        this.capturedImage = canvas.toDataURL('image/jpeg');
        
        // Convert to blob
        canvas.toBlob(blob => {
          if (blob) {
            this.capturedBlob = blob;
          }
        }, 'image/jpeg');
        
        this.stopCamera();
      }
    }
  }

  clearCapturedImage(): void {
    this.capturedImage = null;
    this.capturedBlob = null;
  }

  // Submission Validation
  canSubmit(): boolean {
    if (this.activeTab === 'upload') {
      return !!this.selectedFile;
    } else {
      return !!this.capturedBlob;
    }
  }

  analyzeLeaf(): void {
    let fileToUpload: File | null = null;
    
    if (this.activeTab === 'upload' && this.selectedFile) {
      fileToUpload = this.selectedFile;
    } else if (this.activeTab === 'camera' && this.capturedBlob) {
      fileToUpload = new File([this.capturedBlob], `captured_leaf_${Date.now()}.jpg`, { type: 'image/jpeg' });
    }

    if (!fileToUpload) return;

    this.isAnalyzing = true;
    this.errorMessage = null;
    this.apiService.uploadScan(fileToUpload, this.selectedCrop).subscribe({
      next: (result) => {
        this.scanResult = result;
        this.isAnalyzing = false;
      },
      error: (err) => {
        console.error('Error analyzing leaf image', err);
        if (err && err.error && err.error.error) {
          this.errorMessage = err.error.error;
        } else {
          this.errorMessage = 'Analysis failed. Please try again with a valid image.';
        }
        this.isAnalyzing = false;
      }
    });
  }

  resetTerminal(): void {
    this.scanResult = null;
    this.selectedFile = null;
    this.capturedImage = null;
    this.capturedBlob = null;
    this.errorMessage = null;
    this.stopCamera();
  }

  // Helpers for CSS Classes
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
