import { Routes } from '@angular/router';
import { HomeComponent } from './home/home.component';

export const routes: Routes = [
    { path: '', component: HomeComponent },
    { path: 'dijkstra', loadComponent: () => import('./dijkstra/dijkstra.component').then(m => m.DijkstraComponent) },
    { path: 'floyd', loadComponent: () => import('./floyd/floyd.component').then(m => m.FloydComponent) },
];
