import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { DashboardComponent } from './components/dashboard/dashboard.component';
import { ScanComponent } from './components/scan/scan.component';
import { HistoryComponent } from './components/history/history.component';

const routes: Routes = [
  { path: 'dashboard', component: DashboardComponent },
  { path: 'scan', component: ScanComponent },
  { path: 'history', component: HistoryComponent },
  { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
  { path: '**', redirectTo: 'dashboard' }
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }

