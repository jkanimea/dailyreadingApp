import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { RouterModule, Routes } from '@angular/router';
import { Component } from '@angular/core';

@Component({
  template: `<ion-content class="ion-padding"><h1>Today's Reading</h1></ion-content>`,
  standalone: false
})
class TodayPage {}

const routes: Routes = [{ path: '', component: TodayPage }];

@NgModule({
  declarations: [TodayPage],
  imports: [CommonModule, IonicModule, RouterModule.forChild(routes)]
})
export class TodayModule {}
