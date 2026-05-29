import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { AdminRoutingModule } from './admin-routing.module';
import { LogViewerComponent } from './log-viewer/log-viewer.component';

@NgModule({
  declarations: [LogViewerComponent],
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    AdminRoutingModule
  ]
})
export class AdminModule {}
