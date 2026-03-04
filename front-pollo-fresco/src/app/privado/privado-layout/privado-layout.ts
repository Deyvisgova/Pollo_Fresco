import { CommonModule } from '@angular/common';
import { Component, computed } from '@angular/core';
import { NavigationEnd, Router, RouterModule } from '@angular/router';
import { filter } from 'rxjs/operators';
import { AutenticacionServicio } from '../../servicios/autenticacion.servicio';
import { ConfiguracionEmpresaServicio } from '../../servicios/configuracion-empresa.servicio';

@Component({
  selector: 'app-privado-layout',
  // Componente independiente para que pueda importarse directo en las rutas.
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './privado-layout.html',
  styleUrl: './privado-layout.css'
})
export class PrivadoLayout {
  menuPrincipal = [
    { etiqueta: 'Inicio (por defecto)', ruta: 'inicio' },
    { etiqueta: 'Proveedores', ruta: 'proveedores' },
    { etiqueta: 'Clientes', ruta: 'clientes' }
  ];

  menuPosterior = [
    { etiqueta: 'Pedidos (delivery)', ruta: 'pedidos' },
    { etiqueta: 'Otros productos', ruta: 'otros-productos' },
    { etiqueta: 'Usuarios', ruta: 'usuarios' },
    { etiqueta: 'Gastos', ruta: 'gastos' },
    { etiqueta: 'Configuración', ruta: 'configuracion' },
    { etiqueta: 'Reportes', ruta: 'reportes' }
  ];

  ventaMenuAbierto = false;

  readonly configuracionEmpresa;
  readonly mostrarLogo;

  constructor(
    private readonly autenticacionServicio: AutenticacionServicio,
    private readonly configuracionEmpresaServicio: ConfiguracionEmpresaServicio,
    private readonly router: Router
  ) {
    this.configuracionEmpresa = this.configuracionEmpresaServicio.configuracion;
    this.mostrarLogo = computed(() => Boolean(this.configuracionEmpresa().logoUrl));

    this.sincronizarMenuVenta(this.router.url);
    this.router.events
      .pipe(filter((event) => event instanceof NavigationEnd))
      .subscribe((event) => {
        this.sincronizarMenuVenta((event as NavigationEnd).urlAfterRedirects);
      });
  }

  get rutaVentaActiva(): boolean {
    return this.esRutaVenta(this.router.url);
  }

  toggleVentaMenu(): void {
    this.ventaMenuAbierto = !this.ventaMenuAbierto;
  }

  cerrarSesion(): void {
    this.autenticacionServicio.cerrarSesion().subscribe({
      next: () => this.router.navigate(['/ingresar']),
      error: () => this.router.navigate(['/ingresar'])
    });
  }

  private sincronizarMenuVenta(url: string): void {
    if (this.esRutaVenta(url)) {
      this.ventaMenuAbierto = true;
    }
  }

  private esRutaVenta(url: string): boolean {
    return url.includes('/privado/venta');
  }
}
