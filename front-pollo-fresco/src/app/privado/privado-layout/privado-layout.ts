import { CommonModule } from '@angular/common';
import { AfterViewInit, Component, HostListener, computed } from '@angular/core';
import { NavigationEnd, Router, RouterModule } from '@angular/router';
import { filter } from 'rxjs/operators';
import { AutenticacionServicio } from '../../servicios/autenticacion.servicio';
import { ConfiguracionEmpresaServicio } from '../../servicios/configuracion-empresa.servicio';
import { SesionServicio } from '../../servicios/sesion.servicio';

interface ItemMenu {
  etiqueta: string;
  ruta: string;
  icono: string;
}

@Component({
  selector: 'app-privado-layout',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './privado-layout.html',
  styleUrl: './privado-layout.css'
})
export class PrivadoLayout implements AfterViewInit {
  menuPrincipal: ItemMenu[] = [
    { etiqueta: 'Inicio', ruta: 'inicio', icono: '🏠' },
    { etiqueta: 'Proveedores', ruta: 'proveedores', icono: '🚚' },
    { etiqueta: 'Clientes', ruta: 'clientes', icono: '👥' }
  ];

  menuPosterior: ItemMenu[] = [
    { etiqueta: 'Pedidos (delivery)', ruta: 'pedidos', icono: '📦' },
    { etiqueta: 'Otros productos', ruta: 'otros-productos', icono: '🧺' },
    { etiqueta: 'Usuarios', ruta: 'usuarios', icono: '🧑‍💼' },
    { etiqueta: 'Gastos', ruta: 'gastos', icono: '💸' },
    { etiqueta: 'Configuración', ruta: 'configuracion', icono: '⚙️' },
    { etiqueta: 'Reportes', ruta: 'reportes', icono: '📊' }
  ];

  ventaMenuAbierto = false;
  sidebarMovilAbierto = false;
  sidebarColapsadoDesktop = false;
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

  get esMovilOTablet(): boolean {
    return window.innerWidth <= 900;
  }

  @HostListener('window:resize')
  onResize(): void {
    if (!this.esMovilOTablet) {
      this.sidebarMovilAbierto = false;
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
    if (this.esMovilOTablet) {
      this.sidebarMovilAbierto = !this.sidebarMovilAbierto;
      return;
    }

    this.sidebarColapsadoDesktop = !this.sidebarColapsadoDesktop;
  }

  toggleMenuUsuario(evento: MouseEvent): void {
    evento.stopPropagation();
    this.menuUsuarioAbierto = !this.menuUsuarioAbierto;
  }

  cerrarSidebarEnMovil(): void {
    if (this.esMovilOTablet) {
      this.sidebarMovilAbierto = false;
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
        let encabezados = Array.from(tabla.querySelectorAll('thead th')).map((th) =>
          (th.textContent || '').trim()
        );

        if (!encabezados.length) {
          const primeraFilaConTh = tabla.querySelector('tr');
          encabezados = Array.from(primeraFilaConTh?.querySelectorAll('th') || []).map((th) =>
            (th.textContent || '').trim()
          );
        }

        if (!encabezados.length) {
          return;
        }

        const filas = Array.from(tabla.querySelectorAll('tbody tr'));
        filas.forEach((fila) => {
          Array.from(fila.children).forEach((celda, indice) => {
            if (!(celda instanceof HTMLElement)) {
              return;
            }

            const labelExistente = (celda.getAttribute('data-label') || '').trim();
            if (labelExistente) {
              return;
            }

            const nuevoLabel = encabezados[indice] || `Columna ${indice + 1}`;
            celda.setAttribute('data-label', nuevoLabel);
          });
        });
      });
    });
  }
}
