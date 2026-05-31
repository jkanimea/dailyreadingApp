import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { RouterModule } from '@angular/router';
import { AvatarButtonComponent } from './components/avatar-button/avatar-button.component';

@NgModule({
  declarations: [AvatarButtonComponent],
  imports: [CommonModule, IonicModule, RouterModule],
  exports: [AvatarButtonComponent]
})
export class SharedModule {}
