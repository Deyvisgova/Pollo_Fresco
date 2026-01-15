import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { UsuariosServicio, UsuarioApi } from '../../../servicios/usuarios.servicio';

interface UsuarioFormulario {
  rol_id: number;
  nombres: string;
  apellidos: string;
  usuario: string;
  email: string;
  telefono: string;
  password: string;
  activo: boolean;
}

@Component({
  selector: 'app-privado-usuarios',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './usuarios.html',
  styleUrl: './usuarios.css'
})
export class PrivadoUsuarios implements OnInit {
  usuarios: UsuarioApi[] = [];
  cargando = false;
  mensajeError = '';
  terminoBusqueda = '';
  modoEdicion = false;
  usuarioSeleccionado: UsuarioApi | null = null;
  formulario: UsuarioFormulario = this.crearFormularioVacio();

  roles = [
    { id: 1, nombre: 'Administrador' },
    { id: 2, nombre: 'Vendedor' },
    { id: 3, nombre: 'Delivery' }
  ];

  constructor(private readonly usuariosServicio: UsuariosServicio) {}

  ngOnInit(): void {
    this.cargarUsuarios();
  }

  get usuariosFiltrados(): UsuarioApi[] {
    const termino = this.terminoBusqueda.trim().toLowerCase();
    if (!termino) {
      return this.usuarios;
    }

    return this.usuarios.filter((usuario) => {
      const contenido = [
        usuario.usuario_id,
        usuario.nombres,
        usuario.apellidos,
        usuario.usuario,
        usuario.email,
        usuario.telefono ?? '',
        this.obtenerNombreRol(usuario.rol_id),
        usuario.activo ? 'activo' : 'inactivo'
      ]
        .join(' ')
        .toLowerCase();
      return contenido.includes(termino);
    });
  }

  cargarUsuarios(): void {
    this.cargando = true;
    this.mensajeError = '';
    this.usuariosServicio.listar().subscribe({
      next: (usuarios) => {
        this.usuarios = usuarios;
        this.cargando = false;
      },
      error: () => {
        this.mensajeError =
          'No se pudo cargar la lista de usuarios. Intenta nuevamente.';
        this.cargando = false;
      }
    });
  }

  iniciarNuevo(): void {
    this.modoEdicion = false;
    this.usuarioSeleccionado = null;
    this.formulario = this.crearFormularioVacio();
  }

  seleccionarUsuario(usuario: UsuarioApi): void {
    this.modoEdicion = true;
    this.usuarioSeleccionado = usuario;
    this.formulario = {
      rol_id: usuario.rol_id,
      nombres: usuario.nombres,
      apellidos: usuario.apellidos,
      usuario: usuario.usuario,
      email: usuario.email,
      telefono: usuario.telefono ?? '',
      password: '',
      activo: usuario.activo
    };
  }

  guardarUsuario(): void {
    if (this.modoEdicion && this.usuarioSeleccionado) {
      this.actualizarUsuario();
    } else {
      this.crearUsuario();
    }
  }

  crearUsuario(): void {
    this.cargando = true;
    this.mensajeError = '';
    this.usuariosServicio.crear(this.formulario).subscribe({
      next: (usuario) => {
        this.usuarios = [usuario, ...this.usuarios];
        this.cargando = false;
        this.iniciarNuevo();
      },
      error: () => {
        this.mensajeError =
          'No se pudo crear el usuario. Revisa los datos ingresados.';
        this.cargando = false;
      }
    });
  }

  actualizarUsuario(): void {
    if (!this.usuarioSeleccionado) {
      return;
    }

    this.cargando = true;
    this.mensajeError = '';
    this.usuariosServicio
      .actualizar(this.usuarioSeleccionado.usuario_id, this.formulario)
      .subscribe({
        next: (usuarioActualizado) => {
          this.usuarios = this.usuarios.map((usuario) =>
            usuario.usuario_id === usuarioActualizado.usuario_id
              ? usuarioActualizado
              : usuario
          );
          this.cargando = false;
          this.iniciarNuevo();
        },
        error: () => {
          this.mensajeError =
            'No se pudo actualizar el usuario. Revisa los datos ingresados.';
          this.cargando = false;
        }
      });
  }

  eliminarUsuario(usuario: UsuarioApi): void {
    const confirmacion = confirm(
      `¿Seguro que deseas eliminar al usuario ${usuario.nombres} ${usuario.apellidos}?`
    );
    if (!confirmacion) {
      return;
    }

    this.cargando = true;
    this.mensajeError = '';
    this.usuariosServicio.eliminar(usuario.usuario_id).subscribe({
      next: () => {
        this.usuarios = this.usuarios.filter(
          (item) => item.usuario_id !== usuario.usuario_id
        );
        this.cargando = false;
        if (this.usuarioSeleccionado?.usuario_id === usuario.usuario_id) {
          this.iniciarNuevo();
        }
      },
      error: () => {
        this.mensajeError =
          'No se pudo eliminar el usuario. Intenta nuevamente.';
        this.cargando = false;
      }
    });
  }

  obtenerNombreRol(rolId: number): string {
    return this.roles.find((rol) => rol.id === rolId)?.nombre ?? 'Sin rol';
  }

  private crearFormularioVacio(): UsuarioFormulario {
    return {
      rol_id: 2,
      nombres: '',
      apellidos: '',
      usuario: '',
      email: '',
      telefono: '',
      password: '',
      activo: true
    };
  }
}
