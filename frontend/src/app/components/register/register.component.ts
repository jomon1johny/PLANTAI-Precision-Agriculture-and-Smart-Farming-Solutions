import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-register',
  template: `
    <div class="auth-container animate-fade-in">
      <div class="auth-card glass-panel animate-slide-up">
        <div class="auth-header">
          <span class="auth-icon">🌱</span>
          <h2 class="gradient-text">Create Account</h2>
          <p>Sign up to start monitoring crop health</p>
        </div>

        <form (ngSubmit)="onSubmit()" #registerForm="ngForm" class="auth-form">
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
              [(ngModel)]="user.username" 
              required 
              placeholder="Choose a username"
              #usernameInput="ngModel">
            <div *ngIf="usernameInput.invalid && (usernameInput.dirty || usernameInput.touched)" class="validation-message">
              <span>Username is required.</span>
            </div>
          </div>

          <div class="form-group">
            <label class="form-label" for="email">Email Address</label>
            <input 
              type="email" 
              id="email" 
              name="email" 
              class="form-input" 
              [(ngModel)]="user.email" 
              required 
              email
              placeholder="Enter email address"
              #emailInput="ngModel">
            <div *ngIf="emailInput.invalid && (emailInput.dirty || emailInput.touched)" class="validation-message">
              <span *ngIf="emailInput.errors?.['required']">Email is required.</span>
              <span *ngIf="emailInput.errors?.['email']">Enter a valid email address.</span>
            </div>
          </div>

          <div class="form-group">
            <label class="form-label" for="password">Password</label>
            <input 
              type="password" 
              id="password" 
              name="password" 
              class="form-input" 
              [(ngModel)]="user.password" 
              required 
              minlength="6"
              placeholder="Choose a password"
              #passwordInput="ngModel">
            <div *ngIf="passwordInput.invalid && (passwordInput.dirty || passwordInput.touched)" class="validation-message">
              <span *ngIf="passwordInput.errors?.['required']">Password is required.</span>
              <span *ngIf="passwordInput.errors?.['minlength']">Password must be at least 6 characters.</span>
            </div>
          </div>

          <div class="form-group">
            <label class="form-label" for="confirmPassword">Confirm Password</label>
            <input 
              type="password" 
              id="confirmPassword" 
              name="confirmPassword" 
              class="form-input" 
              [(ngModel)]="user.confirmPassword" 
              required 
              placeholder="Re-enter password"
              #confirmPasswordInput="ngModel">
            <div *ngIf="user.password && user.confirmPassword && user.password !== user.confirmPassword" class="validation-message">
              <span>Passwords do not match.</span>
            </div>
          </div>

          <button type="submit" class="btn btn-primary w-full" [disabled]="registerForm.invalid || loading">
            <span *ngIf="loading" class="spinner"></span>
            {{ loading ? 'Creating Account...' : 'Register' }}
          </button>

          <div class="auth-footer">
            Already have an account? <a routerLink="/login">Log In here</a>
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
export class RegisterComponent {
  user = { username: '', email: '', password: '', confirmPassword: '' };
  loading = false;
  error = '';

  constructor(private authService: AuthService, private router: Router) {
    if (this.authService.getToken()) {
      this.router.navigate(['/dashboard']);
    }
  }

  onSubmit(): void {
    if (this.user.password !== this.user.confirmPassword) {
      this.error = 'Passwords do not match.';
      return;
    }

    this.loading = true;
    this.error = '';

    const registerData = {
      username: this.user.username,
      email: this.user.email,
      password: this.user.password
    };

    this.authService.register(registerData).subscribe({
      next: () => {
        this.loading = false;
        this.router.navigate(['/login'], { queryParams: { registered: 'true' } });
      },
      error: (err) => {
        this.loading = false;
        this.error = err.error?.error || 'Registration failed. Try a different username.';
      }
    });
  }
}
