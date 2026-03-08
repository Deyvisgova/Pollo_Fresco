import { CommonModule } from '@angular/common';
import { AfterViewInit, Component, computed } from '@angular/core';
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
export class PrivadoLayout implements AfterViewInit {
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
  sidebarAbierto = window.innerWidth > 900;

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
        this.actualizarDataLabelsTablas();
      });
  }

  ngAfterViewInit(): void {
    this.actualizarDataLabelsTablas();
  }

  get rutaVentaActiva(): boolean {
    return this.esRutaVenta(this.router.url);
  }

  toggleVentaMenu(): void {
    this.ventaMenuAbierto = !this.ventaMenuAbierto;
  }

  toggleSidebar(): void {
    this.sidebarAbierto = !this.sidebarAbierto;
  }

  cerrarSidebarEnMovil(): void {
    if (window.innerWidth <= 900) {
      this.sidebarAbierto = false;
    }
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

  private actualizarDataLabelsTablas(): void {
    setTimeout(() => {
      const tablas = Array.from(document.querySelectorAll('table'));

      tablas.forEach((tabla) => {
        const encabezados = Array.from(tabla.querySelectorAll('thead th')).map((th) =>
          (th.textContent || '').trim()
        );

        if (!encabezados.length) {
          return;
        }

        const filas = Array.from(tabla.querySelectorAll('tbody tr'));
        filas.forEach((fila) => {
          Array.from(fila.children).forEach((celda, indice) => {
            if (celda instanceof HTMLElement) {
              celda.setAttribute('data-label', encabezados[indice] || 'Dato');
            }
          });
        });
      });
    });
  }
}
