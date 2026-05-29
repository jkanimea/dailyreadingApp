import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { LogViewerComponent } from './log-viewer/log-viewer.component';

const routes: Routes = [
  { path: '', redirectTo: 'logs', pathMatch: 'full' },
  { path: 'logs', component: LogViewerComponent }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class AdminRoutingModule {}
