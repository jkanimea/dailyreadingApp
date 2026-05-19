import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { RouterModule, Routes } from '@angular/router';
import { Component } from '@angular/core';

@Component({
  template: `<ion-content class="ion-padding"><h1>Progress Dashboard</h1></ion-content>`,
  standalone: false
})
class ProgressPage {}

const routes: Routes = [{ path: '', component: ProgressPage }];

@NgModule({
  declarations: [ProgressPage],
  imports: [CommonModule, IonicModule, RouterModule.forChild(routes)]
})
export class ProgressModule {}
