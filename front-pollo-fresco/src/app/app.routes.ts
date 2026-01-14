import { Routes } from '@angular/router';
import { Clientes } from './diseno-publico/paginas/clientes/clientes';
import { Contacto } from './diseno-publico/paginas/contacto/contacto';
import { Ingresar } from './diseno-publico/paginas/ingresar/ingresar';
import { Inicio } from './diseno-publico/paginas/inicio/inicio';
import { Nosotros } from './diseno-publico/paginas/nosotros/nosotros';
import { Productos } from './diseno-publico/paginas/productos/productos';
import { PrivadoLayout } from './privado/privado-layout/privado-layout';
import { PrivadoClientes } from './privado/paginas/clientes/clientes';
import { PrivadoConfiguracion } from './privado/paginas/configuracion/configuracion';
import { PrivadoGastos } from './privado/paginas/gastos/gastos';
import { PrivadoInicio } from './privado/paginas/inicio/inicio';
import { PrivadoOtrosProductos } from './privado/paginas/otros-productos/otros-productos';
import { PrivadoPedidos } from './privado/paginas/pedidos/pedidos';
import { PrivadoProveedores } from './privado/paginas/proveedores/proveedores';
import { PrivadoReportes } from './privado/paginas/reportes/reportes';
import { PrivadoUsuarios } from './privado/paginas/usuarios/usuarios';
import { PrivadoVenta } from './privado/paginas/venta/venta';

export const routes: Routes = [
  {
    path: '',
    pathMatch: 'full',
    redirectTo: 'inicio'
  },
  {
    path: 'inicio',
    component: Inicio
  },
  {
    path: 'nosotros',
    component: Nosotros
  },
  {
    path: 'productos',
    component: Productos
  },
  {
    path: 'clientes',
    component: Clientes
  },
  {
    path: 'contacto',
    component: Contacto
  },
  {
    path: 'ingresar',
    component: Ingresar
  },
  // Ruta general para el panel administrativo con sus rutas hijas.
  {
    path: 'privado',
    component: PrivadoLayout,
    children: [
      {
        path: '',
        pathMatch: 'full',
        redirectTo: 'inicio'
      },
      {
        path: 'inicio',
        component: PrivadoInicio
      },
      {
        path: 'proveedores',
        component: PrivadoProveedores
      },
      {
        path: 'clientes',
        component: PrivadoClientes
      },
      {
        path: 'venta',
        component: PrivadoVenta
      },
      {
        path: 'pedidos',
        component: PrivadoPedidos
      },
      {
        path: 'otros-productos',
        component: PrivadoOtrosProductos
      },
      {
        path: 'usuarios',
        component: PrivadoUsuarios
      },
      {
        path: 'gastos',
        component: PrivadoGastos
      },
      {
        path: 'configuracion',
        component: PrivadoConfiguracion
      },
      {
        path: 'reportes',
        component: PrivadoReportes
      }
    ]
  }
];
