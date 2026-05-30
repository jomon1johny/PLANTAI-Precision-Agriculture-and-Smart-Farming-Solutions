import { Component } from '@angular/core';

@Component({
  selector: 'app-navbar',
  template: `
    <nav class="navbar glass-panel">
      <div class="nav-container">
        <a class="nav-logo" routerLink="/dashboard">
          <span class="logo-icon">🌿</span>
          <span class="logo-text">PLANT<span class="highlight">AI</span></span>
        </a>
        <div class="nav-links">
          <a routerLink="/dashboard" routerLinkActive="active" class="nav-link">Dashboard</a>
          <a routerLink="/scan" routerLinkActive="active" class="nav-link highlight-btn">🔍 Scan Leaf</a>
          <a routerLink="/history" routerLinkActive="active" class="nav-link">History Log</a>
        </div>
      </div>
    </nav>
  `,
  styles: [`
    .navbar {
      position: sticky;
      top: 16px;
      z-index: 1000;
      margin: 16px 24px;
      padding: 12px 32px;
      border-radius: 16px;
    }
    .nav-container {
      display: flex;
      align-items: center;
      justify-content: space-between;
      max-width: 1200px;
      margin: 0 auto;
    }
    .nav-logo {
      display: flex;
      align-items: center;
      gap: 10px;
      text-decoration: none;
      font-family: var(--font-display);
      font-size: 1.5rem;
      font-weight: 800;
      color: hsl(var(--text-primary));
    }
    .logo-text .highlight {
      color: hsl(var(--primary-light));
    }
    .logo-icon {
      font-size: 1.7rem;
    }
    .nav-links {
      display: flex;
      align-items: center;
      gap: 24px;
    }
    .nav-link {
      color: hsl(var(--text-secondary));
      text-decoration: none;
      font-family: var(--font-display);
      font-weight: 500;
      font-size: 0.95rem;
      padding: 6px 12px;
      border-radius: 8px;
      transition: var(--transition-fast);
    }
    .nav-link:hover {
      color: hsl(var(--text-primary));
      background-color: hsla(0, 0%, 100%, 0.05);
    }
    .nav-link.active {
      color: hsl(var(--primary-light));
      background-color: var(--primary-glow);
    }
    .nav-link.highlight-btn {
      background: linear-gradient(135deg, hsl(var(--primary)) 0%, hsl(142, 60%, 35%) 100%);
      color: white;
      font-weight: 600;
      box-shadow: 0 4px 12px hsla(142, 70%, 45%, 0.2);
    }
    .nav-link.highlight-btn:hover {
      transform: translateY(-1px);
      box-shadow: 0 6px 16px hsla(142, 70%, 45%, 0.35);
    }
    .nav-link.highlight-btn.active {
      border: 1px solid hsl(var(--primary-light));
    }

    @media (max-width: 768px) {
      .navbar {
        margin: 10px;
        padding: 10px 16px;
      }
      .nav-links {
        gap: 10px;
      }
      .nav-link {
        font-size: 0.85rem;
        padding: 4px 8px;
      }
    }
  `]
})
export class NavbarComponent {}
