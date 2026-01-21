import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { Router, RouterModule } from '@angular/router';
import { AutenticacionServicio } from '../../servicios/autenticacion.servicio';

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
    { etiqueta: 'Pedidos (delivery)', ruta: 'pedidos' },
    { etiqueta: 'Otros productos', ruta: 'otros-productos' },
    { etiqueta: 'Usuarios', ruta: 'usuarios' },
    { etiqueta: 'Gastos', ruta: 'gastos' },
    { etiqueta: 'Configuración', ruta: 'configuracion' },
    { etiqueta: 'Reportes', ruta: 'reportes' }
  ];

  empresaNombre = 'Pollo Fresco';
  logoUrl: string | null = null;
  logoFileName = 'logo-pollo-fresco.png';

  private readonly logoStorageKey = 'polloFrescoLogoUrl';
  private readonly logoNameStorageKey = 'polloFrescoLogoName';
  private readonly empresaStorageKey = 'polloFrescoEmpresaNombre';

  constructor(
    private readonly autenticacionServicio: AutenticacionServicio,
    private readonly router: Router
  ) {
    this.empresaNombre = localStorage.getItem(this.empresaStorageKey) ?? 'Pollo Fresco';
    this.logoUrl = localStorage.getItem(this.logoStorageKey);
    this.logoFileName = localStorage.getItem(this.logoNameStorageKey) ?? 'logo-pollo-fresco.png';
  }

  cerrarSesion(): void {
    this.autenticacionServicio.cerrarSesion().subscribe({
      next: () => this.router.navigate(['/ingresar']),
      error: () => this.router.navigate(['/ingresar'])
    });
  }
}
