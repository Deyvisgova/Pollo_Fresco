import { CommonModule } from '@angular/common';
import { Component, computed } from '@angular/core';
import { Router, RouterModule } from '@angular/router';
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
  // Menú lateral del panel administrativo con las rutas hijas.
  menu = [
    { etiqueta: 'Inicio (por defecto)', ruta: 'inicio' },
    { etiqueta: 'Proveedores', ruta: 'proveedores' },
    { etiqueta: 'Clientes', ruta: 'clientes' },
    { etiqueta: 'Venta', ruta: 'venta' },
    { etiqueta: '↳ Ventas registradas', ruta: 'venta-registros' },
    { etiqueta: 'Pedidos (delivery)', ruta: 'pedidos' },
    { etiqueta: 'Otros productos', ruta: 'otros-productos' },
    { etiqueta: 'Usuarios', ruta: 'usuarios' },
    { etiqueta: 'Gastos', ruta: 'gastos' },
    { etiqueta: 'Configuración', ruta: 'configuracion' },
    { etiqueta: 'Reportes', ruta: 'reportes' }
  ];

  readonly configuracionEmpresa;
  readonly mostrarLogo;

  constructor(
    private readonly autenticacionServicio: AutenticacionServicio,
    private readonly configuracionEmpresaServicio: ConfiguracionEmpresaServicio,
    private readonly router: Router
  ) {
    this.configuracionEmpresa = this.configuracionEmpresaServicio.configuracion;
    this.mostrarLogo = computed(() => Boolean(this.configuracionEmpresa().logoUrl));
  }

  cerrarSesion(): void {
    this.autenticacionServicio.cerrarSesion().subscribe({
      next: () => this.router.navigate(['/ingresar']),
      error: () => this.router.navigate(['/ingresar'])
    });
  }
}
