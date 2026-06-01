import { Component, OnInit } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-login',
  template: `
    <div class="auth-container animate-fade-in">
      <div class="auth-card glass-panel animate-slide-up">
        <div class="auth-header">
          <span class="auth-icon">🌿</span>
          <h2 class="gradient-text">Welcome Back</h2>
          <p>Log in to access your PlantAI Dashboard</p>
        </div>

        <form (ngSubmit)="onSubmit()" #loginForm="ngForm" class="auth-form">
          <div *ngIf="successMessage" class="success-alert">
            <span>✅</span> {{ successMessage }}
          </div>

          <div *ngIf="error" class="error-alert">
            <span>⚠️</span> {{ error }}
          </div>

          <div class="form-group">
            <label class="form-label" for="username">Username</label>
            <input 
              type="text" 
              id="username" 
              name="username" 
              class="form-input" 
              [(ngModel)]="credentials.username" 
              required 
              placeholder="Enter username"
              #usernameInput="ngModel">
            <div *ngIf="usernameInput.invalid && (usernameInput.dirty || usernameInput.touched)" class="validation-message">
              <span>Username is required.</span>
            </div>
          </div>

          <div class="form-group">
            <label class="form-label" for="password">Password</label>
            <input 
              type="password" 
              id="password" 
              name="password" 
              class="form-input" 
              [(ngModel)]="credentials.password" 
              required 
              placeholder="Enter password"
              #passwordInput="ngModel">
            <div *ngIf="passwordInput.invalid && (passwordInput.dirty || passwordInput.touched)" class="validation-message">
              <span>Password is required.</span>
            </div>
          </div>

          <button type="submit" class="btn btn-primary w-full" [disabled]="loginForm.invalid || loading">
            <span *ngIf="loading" class="spinner"></span>
            {{ loading ? 'Logging in...' : 'Log In' }}
          </button>

          <div class="auth-footer">
            Don't have an account? <a routerLink="/register">Register here</a>
          </div>
        </form>
      </div>
    </div>
  `,
  styles: [`
    .auth-container {
      display: flex;
      justify-content: center;
      align-items: center;
      min-height: calc(100vh - 120px);
      padding: 24px;
    }
    .auth-card {
      width: 100%;
      max-width: 420px;
      padding: 40px 32px;
    }
    .auth-header {
      text-align: center;
      margin-bottom: 32px;
    }
    .auth-icon {
      font-size: 3rem;
      display: block;
      margin-bottom: 12px;
    }
    .auth-header h2 {
      font-size: 2rem;
      margin-bottom: 6px;
    }
    .auth-header p {
      font-size: 0.9rem;
    }
    .auth-form {
      display: flex;
      flex-direction: column;
    }
    .success-alert {
      display: flex;
      align-items: center;
      gap: 8px;
      background-color: var(--primary-glow);
      border: 1px solid hsla(142, 70%, 45%, 0.3);
      color: hsl(var(--primary-light));
      padding: 12px;
      border-radius: 12px;
      margin-bottom: 20px;
      font-size: 0.9rem;
    }
    .error-alert {
      display: flex;
      align-items: center;
      gap: 8px;
      background-color: var(--danger-glow);
      border: 1px solid hsla(350, 80%, 52%, 0.3);
      color: hsl(var(--danger));
      padding: 12px;
      border-radius: 12px;
      margin-bottom: 20px;
      font-size: 0.9rem;
    }
    .w-full {
      width: 100%;
      margin-top: 10px;
    }
    .auth-footer {
      text-align: center;
      margin-top: 24px;
      font-size: 0.9rem;
      color: hsl(var(--text-secondary));
    }
    .auth-footer a {
      color: hsl(var(--primary-light));
      text-decoration: none;
      font-weight: 600;
      transition: var(--transition-fast);
    }
    .auth-footer a:hover {
      text-decoration: underline;
    }
    .spinner {
      display: inline-block;
      width: 16px;
      height: 16px;
      border: 2px solid rgba(255, 255, 255, 0.3);
      border-radius: 50%;
      border-top-color: #fff;
      animation: spin 1s ease-in-out infinite;
      margin-right: 8px;
    }
    .validation-message {
      color: hsl(var(--danger));
      font-size: 0.8rem;
      margin-top: 6px;
      font-weight: 500;
    }
    @keyframes spin {
      to { transform: rotate(360deg); }
    }
  `]
})
export class LoginComponent implements OnInit {
  credentials = { username: '', password: '' };
  loading = false;
  error = '';
  successMessage = '';

  constructor(
    private authService: AuthService,
    private router: Router,
    private route: ActivatedRoute
  ) {
    if (this.authService.getToken()) {
      this.router.navigate(['/dashboard']);
    }
  }

  ngOnInit(): void {
    this.route.queryParams.subscribe(params => {
      if (params['registered'] === 'true') {
        this.successMessage = 'Registration successful! Please log in below.';
      }
    });
  }

  onSubmit(): void {
    if (!this.credentials.username || !this.credentials.password) return;
    this.loading = true;
    this.error = '';
    this.successMessage = '';

    this.authService.login(this.credentials).subscribe({
      next: () => {
        this.loading = false;
        this.router.navigate(['/dashboard']);
      },
      error: (err) => {
        this.loading = false;
        this.error = err.error?.error || 'Invalid credentials or connection issue.';
      }
    });
  }
}
