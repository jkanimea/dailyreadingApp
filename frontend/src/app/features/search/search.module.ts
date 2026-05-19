import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { RouterModule, Routes } from '@angular/router';
import { Component } from '@angular/core';

@Component({
  template: `<ion-content class="ion-padding"><h1>Search</h1></ion-content>`,
  standalone: false
})
class SearchPage {}

const routes: Routes = [{ path: '', component: SearchPage }];

@NgModule({
  declarations: [SearchPage],
  imports: [CommonModule, IonicModule, RouterModule.forChild(routes)]
})
export class SearchModule {}
