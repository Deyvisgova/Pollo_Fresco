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
  password_confirmation: string;
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
  mostrarModal = false;
  mostrarPassword = false;
  mostrarConfirmacion = false;
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
    this.mostrarModal = true;
  }

  seleccionarUsuario(usuario: UsuarioApi): void {
    this.modoEdicion = true;
    this.usuarioSeleccionado = usuario;
    this.formulario = {
      rol_id: Number(usuario.rol_id),
      nombres: usuario.nombres,
      apellidos: usuario.apellidos,
      usuario: usuario.usuario,
      email: usuario.email,
      telefono: usuario.telefono ?? '',
      password: '',
      password_confirmation: '',
      activo: usuario.activo
    };
    this.mostrarModal = true;
  }

  cerrarModal(): void {
    this.mostrarModal = false;
    this.mostrarPassword = false;
    this.mostrarConfirmacion = false;
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
    this.usuariosServicio.crear(this.obtenerPayload()).subscribe({
      next: (usuario) => {
        this.usuarios = [usuario, ...this.usuarios];
        this.cargando = false;
        this.cerrarModal();
        this.formulario = this.crearFormularioVacio();
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
      .actualizar(this.usuarioSeleccionado.usuario_id, this.obtenerPayload())
      .subscribe({
        next: (usuarioActualizado) => {
          this.usuarios = this.usuarios.map((usuario) =>
            usuario.usuario_id === usuarioActualizado.usuario_id
              ? usuarioActualizado
              : usuario
          );
          this.cargando = false;
          this.cerrarModal();
          this.formulario = this.crearFormularioVacio();
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

  get passwordsCoinciden(): boolean {
    return this.formulario.password === this.formulario.password_confirmation;
  }

  get passwordValida(): boolean {
    if (this.modoEdicion && !this.formulario.password) {
      return true;
    }
    return /^(?=.*[A-Za-z])(?=.*\d).{6,}$/.test(this.formulario.password);
  }

  get formularioValido(): boolean {
    const usuario = this.formulario.usuario.trim();
    const nombres = this.formulario.nombres.trim();
    const apellidos = this.formulario.apellidos.trim();
    const email = this.formulario.email.trim();
    const emailValido = /^[^@]+@[^@]+\.[^@]+$/.test(email);

    if (!usuario || !nombres || !apellidos || !emailValido) {
      return false;
    }

    if (!this.modoEdicion || this.formulario.password) {
      return this.passwordValida && this.passwordsCoinciden;
    }

    return true;
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
      password_confirmation: '',
      activo: true
    };
  }

  private obtenerPayload() {
    const password = this.formulario.password.trim();
    const confirmacion = this.formulario.password_confirmation.trim();

    return {
      ...this.formulario,
      password: password ? password : null,
      password_confirmation: password ? confirmacion : null,
      rol_id: Number(this.formulario.rol_id)
    };
  }
}
