import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, BehaviorSubject, of } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';
import { Router } from '@angular/router';

export interface User {
  id: number;
  username: string;
  email: string;
}

export interface AuthResponse {
  token: string;
  user: User;
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private baseUrl = 'http://localhost:8000/api/auth';
  private currentUserSubject = new BehaviorSubject<User | null>(null);
  private isAuthenticatedSubject = new BehaviorSubject<boolean>(false);

  public currentUser$ = this.currentUserSubject.asObservable();
  public isAuthenticated$ = this.isAuthenticatedSubject.asObservable();

  constructor(private http: HttpClient, private router: Router) {
    const token = this.getToken();
    if (token) {
      this.fetchCurrentUser().subscribe({
        next: (user) => {
          this.currentUserSubject.next(user);
          this.isAuthenticatedSubject.next(true);
        },
        error: () => {
          this.clearAuth();
          this.router.navigate(['/login']);
        }
      });
    }
  }

  public get currentUserValue(): User | null {
    return this.currentUserSubject.value;
  }

  public getToken(): string | null {
    return localStorage.getItem('plantai_token');
  }

  private setToken(token: string): void {
    localStorage.setItem('plantai_token', token);
  }

  private clearAuth(): void {
    localStorage.removeItem('plantai_token');
    this.currentUserSubject.next(null);
    this.isAuthenticatedSubject.next(false);
  }

  fetchCurrentUser(): Observable<User> {
    return this.http.get<User>(`${this.baseUrl}/user/`);
  }

  login(credentials: { username: string; password: string }): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.baseUrl}/login/`, credentials).pipe(
      tap(res => {
        this.setToken(res.token);
        this.currentUserSubject.next(res.user);
        this.isAuthenticatedSubject.next(true);
      })
    );
  }

  register(user: any): Observable<any> {
    return this.http.post<any>(`${this.baseUrl}/register/`, user);
  }

  logout(): Observable<any> {
    return this.http.post(`${this.baseUrl}/logout/`, {}).pipe(
      catchError(() => {
        return of(null);
      }),
      tap(() => {
        this.clearAuth();
        this.router.navigate(['/login']);
      })
    );
  }
}
