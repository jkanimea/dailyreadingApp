import { NgModule } from '@angular/core';
import { PreloadAllModules, RouterModule, Routes } from '@angular/router';
import { AuthGuard } from './core/guards/auth.guard';
import { AdminGuard } from './core/guards/admin.guard';

const routes: Routes = [
  {
    path: 'login',
    loadChildren: () => import('./features/login/login.module').then(m => m.LoginModule)
  },
  {
    path: 'series',
    loadChildren: () => import('./features/series/series.module').then(m => m.SeriesModule),
    canActivate: [AuthGuard]
  },
  { path: 'reading/:id', redirectTo: ({ params }) => `/tabs/reading/${params['id']}`, pathMatch: 'full' },
  {
    path: 'search',
    loadChildren: () => import('./features/search/search.module').then(m => m.SearchModule),
    canActivate: [AuthGuard]
  },
  {
    path: 'progress',
    loadChildren: () => import('./features/progress/progress.module').then(m => m.ProgressModule),
    canActivate: [AuthGuard]
  },
  {
    path: 'bookmarks',
    loadChildren: () => import('./features/bookmarks/bookmarks.module').then(m => m.BookmarksModule),
    canActivate: [AuthGuard]
  },
  {
    path: 'bible-verses',
    loadChildren: () => import('./features/bible-verses/bible-verses.module').then(m => m.BibleVersesModule),
    canActivate: [AuthGuard]
  },
  {
    path: 'settings',
    loadChildren: () => import('./features/settings/settings.module').then(m => m.SettingsModule),
    canActivate: [AuthGuard]
  },
  {
    path: 'account',
    loadChildren: () => import('./features/account/account.module').then(m => m.AccountModule),
    canActivate: [AuthGuard]
  },
  {
    path: 'admin',
    loadChildren: () => import('./features/admin/admin.module').then(m => m.AdminModule),
    canActivate: [AdminGuard]
  },
  {
    path: 'tabs',
    loadChildren: () => import('./features/tabs/tabs.module').then(m => m.TabsModule),
    canActivate: [AuthGuard]
  },
  {
    path: '',
    loadChildren: () => import('./features/legal/legal.module').then(m => m.LegalModule)
  },
  { path: 'today', redirectTo: '/tabs/today', pathMatch: 'full' },
  { path: 'calendar', redirectTo: '/tabs/calendar', pathMatch: 'full' },
  { path: 'journal', redirectTo: '/tabs/journal', pathMatch: 'full' },
  { path: '', redirectTo: '/tabs/today', pathMatch: 'full' },
  { path: '**', redirectTo: '/tabs/today' }
];

@NgModule({
  imports: [RouterModule.forRoot(routes, { preloadingStrategy: PreloadAllModules })],
  exports: [RouterModule]
})
export class AppRoutingModule {}
