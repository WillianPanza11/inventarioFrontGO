import { Component, inject } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { TagModule } from 'primeng/tag';
import { ToastModule } from 'primeng/toast';
import { AuthService } from '../core/auth/auth.service';

interface NavItem {
  path: string;
  label: string;
  icon: string;
  adminOnly: boolean;
}

@Component({
  selector: 'app-layout',
  imports: [RouterLink, RouterLinkActive, RouterOutlet, ButtonModule, TagModule, ToastModule],
  templateUrl: './layout.html',
  styleUrl: './layout.css',
})
export class Layout {
  protected readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  protected readonly navItems: NavItem[] = [
    { path: '/dashboard', label: 'Dashboard', icon: 'pi pi-home', adminOnly: false },
    { path: '/devices', label: 'Dispositivos', icon: 'pi pi-mobile', adminOnly: false },
    { path: '/alertas', label: 'Alertas', icon: 'pi pi-exclamation-triangle', adminOnly: false },
    { path: '/admin', label: 'Administración', icon: 'pi pi-cog', adminOnly: true },
  ];

  logout(): void {
    this.authService.logout();
    this.router.navigateByUrl('/login');
  }
}
