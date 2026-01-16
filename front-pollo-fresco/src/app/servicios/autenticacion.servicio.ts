import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, catchError, map, tap, throwError } from 'rxjs';
import { SesionServicio, UsuarioSesion } from './sesion.servicio';

export interface CredencialesIngreso {
  usuario: string;
  password: string;
}

interface RespuestaLoginApi {
  message: string;
  user: UsuarioSesion;
  token: string;
}

/**
 * Servicio de autenticación que centraliza el inicio de sesión
 * contra la API de Laravel.
 */
@Injectable({ providedIn: 'root' })
export class AutenticacionServicio {
  // URL base de la API. Ajustar si cambia el dominio o puerto.
  private readonly apiBase = '/api';

  constructor(
    private readonly http: HttpClient,
    private readonly sesionServicio: SesionServicio
  ) {}

  /**
   * Envía las credenciales al backend, guarda la sesión y retorna el usuario autenticado.
   */
  iniciarSesion(credenciales: CredencialesIngreso): Observable<UsuarioSesion> {
    return this.http
      .post<RespuestaLoginApi>(`${this.apiBase}/auth/login`, credenciales)
      .pipe(
        tap((respuesta) =>
          this.sesionServicio.guardarSesion(respuesta.user, respuesta.token)
        ),
        map((respuesta) => respuesta.user)
      );
  }

  /**
   * Cierra la sesión actual en el backend y limpia la sesión local.
   */
  cerrarSesion(): Observable<void> {
    const token = this.sesionServicio.obtenerToken();
    const headers = token ? new HttpHeaders({ Authorization: `Bearer ${token}` }) : undefined;

    return this.http
      .post<{ message: string }>(`${this.apiBase}/auth/logout`, {}, { headers })
      .pipe(
        tap(() => this.sesionServicio.limpiarSesion()),
        map(() => undefined),
        catchError((error) => {
          this.sesionServicio.limpiarSesion();
          return throwError(() => error);
        })
      );
  }
}
