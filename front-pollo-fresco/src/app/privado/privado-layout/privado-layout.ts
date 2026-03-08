import { CommonModule } from '@angular/common';
import { AfterViewInit, Component, HostListener, computed } from '@angular/core';
import { NavigationEnd, Router, RouterModule } from '@angular/router';
import { filter } from 'rxjs/operators';
import { AutenticacionServicio } from '../../servicios/autenticacion.servicio';
import { ConfiguracionEmpresaServicio } from '../../servicios/configuracion-empresa.servicio';
import { SesionServicio } from '../../servicios/sesion.servicio';

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
  menuUsuarioAbierto = false;

  readonly configuracionEmpresa;
  readonly mostrarLogo;
  readonly nombreUsuario;

  constructor(
    private readonly autenticacionServicio: AutenticacionServicio,
    private readonly configuracionEmpresaServicio: ConfiguracionEmpresaServicio,
    private readonly sesionServicio: SesionServicio,
    private readonly router: Router
  ) {
    this.configuracionEmpresa = this.configuracionEmpresaServicio.configuracion;
    this.mostrarLogo = computed(() => Boolean(this.configuracionEmpresa().logoUrl));
    this.nombreUsuario = computed(() => {
      const usuario = this.sesionServicio.obtenerUsuario();
      return usuario?.name || usuario?.usuario || 'Usuario';
    });

    this.sincronizarMenuVenta(this.router.url);
    this.router.events
      .pipe(filter((event) => event instanceof NavigationEnd))
      .subscribe((event) => {
        this.sincronizarMenuVenta((event as NavigationEnd).urlAfterRedirects);
        this.actualizarDataLabelsTablas();
        this.menuUsuarioAbierto = false;
      });
  }

  @HostListener('window:resize')
  onResize(): void {
    if (window.innerWidth > 900) {
      this.sidebarAbierto = true;
    }
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(evento: MouseEvent): void {
    const target = evento.target as HTMLElement;
    if (!target.closest('.panel__usuario')) {
      this.menuUsuarioAbierto = false;
    }
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

  toggleMenuUsuario(evento: MouseEvent): void {
    evento.stopPropagation();
    this.menuUsuarioAbierto = !this.menuUsuarioAbierto;
  }

  cerrarSidebarEnMovil(): void {
    if (window.innerWidth <= 900) {
      this.sidebarAbierto = false;
    }
  }

  irACambiarContrasena(): void {
    this.menuUsuarioAbierto = false;
    void this.router.navigate(['/privado/usuarios']);
  }

  cerrarSesion(): void {
    this.menuUsuarioAbierto = false;
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
