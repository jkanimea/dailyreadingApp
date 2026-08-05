import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { RouterModule, Routes } from '@angular/router';
import { Component } from '@angular/core';

@Component({
  template: `
    <ion-header>
      <ion-toolbar>
        <ion-buttons slot="start">
          <ion-button (click)="goHome()">Back</ion-button>
        </ion-buttons>
        <ion-title>Privacy Policy</ion-title>
      </ion-toolbar>
    </ion-header>
    <ion-content class="legal-content">
      <article class="legal-article">
        <h1>Privacy Policy</h1>
        <p class="last-updated">Last updated: June 19, 2026</p>

        <h2>Information We Collect</h2>
        <ul>
          <li><strong>Account Information</strong>: When you sign in with Google, we receive your email address and display name.</li>
          <li><strong>Reading Progress</strong>: We store your daily reading completion status, journal notes, and preferences.</li>
          <li><strong>Device Information</strong>: Basic device information for app functionality (preferred Bible translation, font size settings).</li>
        </ul>

        <h2>How We Use Your Information</h2>
        <ul>
          <li>To provide daily reading content and track your reading progress</li>
          <li>To save your personal journal notes</li>
          <li>To remember your app preferences</li>
          <li>To improve app functionality</li>
        </ul>

        <h2>Data Storage</h2>
        <p>Your data is stored securely on our servers. Your journal notes and reading progress are private to your account.</p>

        <h2>Third-Party Services</h2>
        <ul>
          <li><strong>Google Sign-In</strong>: Used for authentication only. We do not share data with Google beyond what's required for login.</li>
          <li><strong>Google Play Services</strong>: Standard Android app distribution and analytics.</li>
        </ul>

        <h2>Data Deletion</h2>
        <p>You can request account deletion by contacting us at the email below. Your data will be removed within 30 days. See our <a routerLink="/delete-account">data deletion</a> page for details.</p>

        <h2>Contact</h2>
        <p>Email: <a href="mailto:jack@kanimea.com">jack@kanimea.com</a></p>

        <h2>Changes</h2>
        <p>We may update this policy. Changes will be posted here with an updated date.</p>
      </article>
    </ion-content>
  `,
  standalone: false,
  styles: [`
    .legal-content { --background: var(--ion-background-color); }
    .legal-article {
      max-width: 720px; margin: 0 auto; padding: 24px 20px 48px;
      color: var(--ion-text-color); font-size: 15px; line-height: 1.6;
    }
    .legal-article h1 { font-size: 26px; font-weight: 800; margin: 0 0 4px; }
    .legal-article .last-updated { color: var(--ion-color-medium); font-size: 13px; margin: 0 0 20px; }
    .legal-article h2 { font-size: 18px; font-weight: 700; margin: 28px 0 8px; }
    .legal-article p, .legal-article li { line-height: 1.6; }
    .legal-article a { color: var(--ion-color-primary); }
  `]
})
export class PrivacyPolicyPage {
  goHome(): void {
    window.location.href = '/';
  }
}

@Component({
  template: `
    <ion-header>
      <ion-toolbar>
        <ion-buttons slot="start">
          <ion-button (click)="goHome()">Back</ion-button>
        </ion-buttons>
        <ion-title>Delete Account &amp; Data</ion-title>
      </ion-toolbar>
    </ion-header>
    <ion-content class="legal-content">
      <article class="legal-article">
        <h1>Delete Account &amp; Data</h1>
        <p>To request deletion of your <strong>Encounter Daily</strong> account and associated data:</p>
        <ol>
          <li><strong>Email us</strong> at <a href="mailto:jack@kanimea.com">jack@kanimea.com</a> from the email address used to sign in</li>
          <li>Include the subject line: <strong>"Delete My Account"</strong></li>
          <li>We will process your request within 30 days</li>
        </ol>

        <h2>What gets deleted</h2>
        <ul>
          <li>Your profile information (email, display name)</li>
          <li>Reading progress history</li>
          <li>Journal notes</li>
          <li>Saved preferences</li>
        </ul>

        <h2>What is retained</h2>
        <p>No personal data is retained after deletion.</p>

        <h2>Contact</h2>
        <p>For questions: <a href="mailto:jack@kanimea.com">jack@kanimea.com</a></p>
      </article>
    </ion-content>
  `,
  standalone: false,
  styles: [`
    .legal-content { --background: var(--ion-background-color); }
    .legal-article {
      max-width: 720px; margin: 0 auto; padding: 24px 20px 48px;
      color: var(--ion-text-color); font-size: 15px; line-height: 1.6;
    }
    .legal-article h1 { font-size: 26px; font-weight: 800; margin: 0 0 16px; }
    .legal-article h2 { font-size: 18px; font-weight: 700; margin: 28px 0 8px; }
    .legal-article p, .legal-article li { line-height: 1.6; }
    .legal-article a { color: var(--ion-color-primary); }
  `]
})
export class DeleteAccountPage {
  goHome(): void {
    window.location.href = '/';
  }
}

const routes: Routes = [
  { path: 'privacy', component: PrivacyPolicyPage },
  { path: 'delete-account', component: DeleteAccountPage }
];

@NgModule({
  declarations: [PrivacyPolicyPage, DeleteAccountPage],
  imports: [CommonModule, IonicModule, RouterModule.forChild(routes)]
})
export class LegalModule {}