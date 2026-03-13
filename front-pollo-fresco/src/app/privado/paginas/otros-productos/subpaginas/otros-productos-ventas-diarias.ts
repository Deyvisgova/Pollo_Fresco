import { CommonModule } from '@angular/common';
import { HttpClient, HttpClientModule, HttpHeaders, HttpParams } from '@angular/common/http';
import { Component, ElementRef, HostListener, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Subject, debounceTime } from 'rxjs';
import { SesionServicio } from '../../../../servicios/sesion.servicio';

interface Producto {
  id: number;
  nombre: string;
  grupo_venta: 'HUEVOS' | 'CONGELADO' | 'OTROS';
}

interface ProductoApi {
  id: number;
  nombre: string;
  grupo_venta: 'HUEVOS' | 'CONGELADO' | 'OTROS';
}

interface LoteApi {
  producto_id: number;
  cantidad: number;
  estado: 'ABIERTO' | 'CERRADO';
}

interface VentaDiariaItem {
  ventaId: number | null;
  fechaHora: string;
  productoId: number | null;
  productoNombre: string;
  grupoVenta: 'HUEVOS' | 'CONGELADO' | 'OTROS' | null;
  filtroProducto: string;
  dropdownAbierto: boolean;
  cantidad: string;
  precio: string;
}

type CampoNumerico = 'cantidad' | 'precio';

interface VentaCerradaItem {
  ventaOpDiariaId: number;
  fechaHora: string;
  productoNombre: string;
  cantidad: number;
  precio: number;
  total: number;
  categoria: 'HUEVOS' | 'CONGELADO' | 'OTROS';
}

interface CierreHistorico {
  fecha: string;
  cerrado_en: string | null;
  total_huevos: number;
  total_congelados: number;
  total_general: number;
  items: VentaCerradaItem[];
}

interface EstadoVentaApi {
  fecha: string;
  cerrado: boolean;
  filas: Array<{
    venta_op_diaria_id: number;
    producto_id: number;
    producto_nombre: string;
    grupo_venta: 'HUEVOS' | 'CONGELADO' | 'OTROS';
    cantidad: number;
    precio: number;
    fecha_hora: string;
    cerrado_en: string | null;
  }>;
  cierres: Array<{
    fecha: string;
    cerrado_en: string | null;
    total_huevos: number;
    total_congelados: number;
    total_general: number;
    items: Array<{
      venta_op_diaria_id: number;
      fecha_hora: string;
      producto_nombre: string;
      cantidad: number;
      precio: number;
      total: number;
      grupo_venta: 'HUEVOS' | 'CONGELADO' | 'OTROS';
    }>;
  }>;
}

interface DropdownPosicion {
  top: number;
  left: number;
  width: number;
  maxHeight: number;
}

@Component({
  selector: 'app-privado-otros-productos-ventas-diarias',
  standalone: true,
  imports: [CommonModule, FormsModule, HttpClientModule],
  templateUrl: './otros-productos-ventas-diarias.html',
  styleUrl: './otros-productos-ventas-diarias.css'
})
export class PrivadoOtrosProductosVentasDiarias implements OnInit, OnDestroy {
  @ViewChild('buscadorDropdown') buscadorDropdown?: ElementRef<HTMLInputElement>;

  fechaHoy = this.obtenerFechaLocalISO();
  fechaHoraActual = this.obtenerFechaHoraLocalInput();
  usuarioActual = '-';
  cerrado = false;
  productos: Producto[] = [];
  mensajeError = '';
  guardando = false;

  ventas: VentaDiariaItem[] = [];
  cierresHistoricos: CierreHistorico[] = [];

  activeDropdownIndex: number | null = null;
  dropdownAbrirHaciaArriba = false;
  dropdownPosicion: DropdownPosicion = { top: 0, left: 0, width: 300, maxHeight: 320 };
  indiceProductoResaltado = 0;

  modalDetalleAbierto = false;
  cierreDetalle: CierreHistorico | null = null;

  private readonly guardado$ = new Subject<void>();
  private productoIdsConLote = new Set<number>();
  private stockDisponiblePorProducto = new Map<number, number>();
  private filaAdvertenciaStock: number | null = null;
  private readonly panelMargin = 8;
  private readonly panelMaxHeight = 320;
  private readonly panelMinHeight = 150;
  private triggerDropdownActivo: HTMLElement | null = null;

  private readonly onWindowResize = () => this.reposicionarDropdownActivo();
  private readonly onWindowScroll = () => this.reposicionarDropdownActivo();
  private relojIntervalId: ReturnType<typeof setInterval> | null = null;
  private syncIntervalId: ReturnType<typeof setInterval> | null = null;

  constructor(
    private readonly http: HttpClient,
    private readonly sesionServicio: SesionServicio
  ) {}

  ngOnInit(): void {
    this.usuarioActual = this.obtenerNombreUsuario();
    this.cargarProductos();
    this.cargarLotesDisponibles();
    this.cargarEstadoFecha();
    this.iniciarRelojFechaHora();
    this.iniciarSincronizacionAutomatica();
    this.guardado$.pipe(debounceTime(500)).subscribe(() => {
      this.guardarBorrador();
    });
  }

  ngOnDestroy(): void {
    this.desregistrarListenersReubicacion();
    if (this.relojIntervalId) {
      clearInterval(this.relojIntervalId);
      this.relojIntervalId = null;
    }
    if (this.syncIntervalId) {
      clearInterval(this.syncIntervalId);
      this.syncIntervalId = null;
    }
  }

  get dropdownAbierto(): boolean {
    return this.activeDropdownIndex !== null;
  }

  get filtroDropdownActivo(): string {
    if (this.activeDropdownIndex === null) {
      return '';
    }

    return this.ventas[this.activeDropdownIndex]?.filtroProducto ?? '';
  }

  get productosDropdownActivos(): Producto[] {
    if (this.activeDropdownIndex === null) {
      return [];
    }

    return this.productosFiltrados(this.activeDropdownIndex);
  }

  get totalHuevos(): number {
    return this.ventas.reduce((acc, venta) => {
      if (venta.grupoVenta !== 'HUEVOS') {
        return acc;
      }
      return acc + this.calcularTotalFila(venta);
    }, 0);
  }

  get totalCongelados(): number {
    return this.ventas.reduce((acc, venta) => {
      if (venta.grupoVenta !== 'CONGELADO') {
        return acc;
      }
      return acc + this.calcularTotalFila(venta);
    }, 0);
  }

  crearFilaVacia(fechaHora: string): VentaDiariaItem {
    return {
      ventaId: null,
      fechaHora,
      productoId: null,
      productoNombre: '',
      grupoVenta: null,
      filtroProducto: '',
      dropdownAbierto: false,
      cantidad: '',
      precio: ''
    };
  }

  agregarFila(): void {
    const fechaHoraFila = this.obtenerFechaHoraLocalInput();
    this.ventas = [...this.ventas, this.crearFilaVacia(fechaHoraFila)];
  }

  quitarFila(index: number): void {
    this.ventas = this.ventas.filter((_, i) => i !== index);

    if (this.activeDropdownIndex !== null && (this.activeDropdownIndex === index || this.activeDropdownIndex >= this.ventas.length)) {
      this.cerrarDropdownProducto();
    }

    if (this.filaAdvertenciaStock !== null) {
      if (this.filaAdvertenciaStock === index) {
        this.filaAdvertenciaStock = null;
      } else if (this.filaAdvertenciaStock > index) {
        this.filaAdvertenciaStock -= 1;
      }
    }

    this.programarGuardado();
  }

  limpiarFila(index: number): void {
    const fechaHoraActualFila = this.ventas[index]?.fechaHora || this.obtenerFechaHoraLocalInput();
    this.ventas[index] = this.crearFilaVacia(fechaHoraActualFila);
    this.ventas = [...this.ventas];

    if (this.activeDropdownIndex === index) {
      this.indiceProductoResaltado = 0;
    }

    if (this.filaAdvertenciaStock === index) {
      this.filaAdvertenciaStock = null;
    }

    this.programarGuardado();
  }



  stockRestanteFila(index: number): number | null {
    const fila = this.ventas[index];
    if (!fila?.productoId) {
      return null;
    }

    const stockDisponible = this.stockDisponiblePorProducto.get(fila.productoId);
    if (stockDisponible == null) {
      return null;
    }

    const totalEnFormulario = this.ventas.reduce((acc, item) => {
      if (item.productoId !== fila.productoId) {
        return acc;
      }
      return acc + this.parseNumero(item.cantidad);
    }, 0);

    return stockDisponible - totalEnFormulario;
  }

  mostrarAdvertenciaStock(index: number): boolean {
    const restante = this.stockRestanteFila(index);
    return this.filaAdvertenciaStock === index && restante !== null && restante <= 5;
  }

  formatearFechaDMY(valor: string | null | undefined): string {
    if (!valor) {
      return '-';
    }

    const limpio = valor.includes('T') ? valor.split('T')[0] : valor.split(' ')[0];
    const [anio, mes, dia] = limpio.split('-');
    if (!anio || !mes || !dia) {
      return valor;
    }

    return `${dia}/${mes}/${anio}`;
  }

  formatearFechaHoraDMY(valor: string | null | undefined): string {
    if (!valor) {
      return '-';
    }

    const normalizado = valor.replace(' ', 'T');
    const [fecha, horaCompleta = '00:00:00'] = normalizado.split('T');
    const [anio, mes, dia] = fecha.split('-');
    if (!anio || !mes || !dia) {
      return valor;
    }

    return `${dia}/${mes}/${anio} ${horaCompleta.slice(0, 5)}`;
  }


  formatearHora(valor: string | null | undefined): string {
    if (!valor) {
      return '-';
    }

    const normalizado = valor.replace(' ', 'T');
    const [, horaCompleta = '00:00:00'] = normalizado.split('T');
    return horaCompleta.slice(0, 5);
  }

  tituloCierre(cierre: CierreHistorico): string {
    if (!cierre.cerrado_en) {
      return this.formatearFechaDMY(cierre.fecha);
    }

    const normalizado = cierre.cerrado_en.replace(' ', 'T');
    const [fecha] = normalizado.split('T');
    return `${this.formatearFechaDMY(fecha)} (${this.formatearHora(cierre.cerrado_en)})`;
  }



  private mostrarAlertaStockAgotado(nombreProducto: string): void {
    const swal = (window as unknown as { Swal?: { fire: (options: Record<string, unknown>) => Promise<{ isConfirmed: boolean }> } }).Swal;
    if (!swal) {
      window.alert(`Sin stock disponible para ${nombreProducto}.`);
      return;
    }

    swal.fire({
      title: 'Stock agotado',
      text: `El producto "${nombreProducto}" no tiene stock disponible.`,
      icon: 'warning',
      confirmButtonText: 'Entendido',
      customClass: {
        container: 'swal-zindex-superior'
      }
    });
  }

  private mostrarAlertaCantidadExcedida(stockDisponible: number): void {
    const swal = (window as unknown as { Swal?: { fire: (options: Record<string, unknown>) => Promise<{ isConfirmed: boolean }> } }).Swal;
    if (!swal) {
      window.alert(`La cantidad supera el stock disponible (${stockDisponible.toFixed(2)}).`);
      return;
    }

    swal.fire({
      title: 'Cantidad no permitida',
      text: `No puedes exceder el stock disponible (${stockDisponible.toFixed(2)}).`,
      icon: 'warning',
      confirmButtonText: 'Entendido',
      customClass: {
        container: 'swal-zindex-superior'
      }
    });
  }

  private stockDisponibleFormulario(productoId: number): number {
    return this.stockDisponiblePorProducto.get(productoId) ?? 0;
  }
  private actualizarAdvertenciaStock(index: number): void {
    const fila = this.ventas[index];
    if (!fila?.productoId) {
      if (this.filaAdvertenciaStock === index) {
        this.filaAdvertenciaStock = null;
      }
      return;
    }

    const restante = this.stockRestanteFila(index);
    if (restante === null || restante > 5) {
      if (this.filaAdvertenciaStock === index) {
        this.filaAdvertenciaStock = null;
      }
      return;
    }

    this.filaAdvertenciaStock = this.ventas
      .map((item, idx) => ({ item, idx }))
      .filter(({ item }) => item.productoId === fila.productoId)
      .slice(-1)[0]?.idx ?? index;
  }

  actualizarCampoNumerico(index: number, campo: CampoNumerico, valor: string): void {
    const fila = this.ventas[index];
    if (!fila) {
      return;
    }

    fila[campo] = valor ?? '';
    if (campo === 'cantidad') {
      const stockDisponible = fila.productoId ? this.stockDisponibleFormulario(fila.productoId) : null;
      const totalProducto = fila.productoId
        ? this.ventas.reduce((acc, item) => item.productoId === fila.productoId ? acc + this.parseNumero(item.cantidad) : acc, 0)
        : 0;

      if (stockDisponible !== null && totalProducto > stockDisponible) {
        fila.cantidad = '0';
        this.mostrarAlertaCantidadExcedida(stockDisponible);
      }
      this.actualizarAdvertenciaStock(index);
    }
    this.programarGuardado();
  }

  normalizarCampoNumerico(index: number, campo: CampoNumerico): void {
    const fila = this.ventas[index];
    if (!fila) {
      return;
    }

    fila[campo] = this.normalizarEntradaDecimal(fila[campo]);
    this.programarGuardado();
  }

  calcularTotalFila(venta: VentaDiariaItem): number {
    const cantidad = this.parseNumero(venta.cantidad);
    const precio = this.parseNumero(venta.precio);
    return cantidad * precio;
  }

  cerrarDia(): void {
    if (this.cerrado) {
      window.alert('El día ya está cerrado. Debes reabrir el día para editar.');
      return;
    }

    const headers = this.obtenerHeaders();
    this.http.post('/api/otros-productos/ventas-diarias/cerrar', { fecha: this.fechaHoy }, { headers }).subscribe({
      next: () => {
        this.fechaHoraActual = this.obtenerFechaHoraLocalInput();
        this.fechaHoy = this.fechaHoraActual.slice(0, 10);
        this.ventas = [];
        this.cerrarDropdownProducto();
        this.cargarEstadoFecha();
      },
      error: (error) => {
        this.mensajeError = error?.error?.message || 'No se pudo cerrar el día.';
      }
    });
  }

  reabrirDia(fecha: string): void {
    const headers = this.obtenerHeaders();
    this.http.post('/api/otros-productos/ventas-diarias/reabrir', { fecha }, { headers }).subscribe({
      next: () => {
        this.fechaHoy = fecha;
        this.fechaHoraActual = this.combinarFechaConHoraActual(fecha);
        this.cargarEstadoFecha();
      },
      error: (error) => {
        this.mensajeError = error?.error?.message || 'No se pudo reabrir el día.';
      }
    });
  }

  abrirDetalle(cierre: CierreHistorico): void {
    this.cierreDetalle = cierre;
    this.modalDetalleAbierto = true;
  }

  cerrarModalDetalle(): void {
    this.modalDetalleAbierto = false;
    this.cierreDetalle = null;
  }

  dropdownAbiertoEnFila(index: number): boolean {
    return this.activeDropdownIndex === index;
  }

  toggleDropdownProducto(index: number, event: MouseEvent): void {
    const trigger = event.currentTarget as HTMLElement | null;
    if (!trigger) {
      return;
    }

    if (this.activeDropdownIndex === index) {
      this.cerrarDropdownProducto();
      return;
    }

    const fila = this.ventas[index];
    if (fila) {
      fila.filtroProducto = '';
    }

    this.abrirDropdownProducto(index, trigger);
  }

  onTriggerProductoKeydown(index: number, event: KeyboardEvent): void {
    if (!['ArrowDown', 'Enter', ' '].includes(event.key)) {
      return;
    }

    event.preventDefault();
    const trigger = event.currentTarget as HTMLElement | null;
    if (!trigger) {
      return;
    }

    const fila = this.ventas[index];
    if (fila) {
      fila.filtroProducto = '';
    }

    this.abrirDropdownProducto(index, trigger);
  }

  onBuscadorProductoKeydown(event: KeyboardEvent): void {
    if (!this.dropdownAbierto) {
      return;
    }

    if (event.key === 'ArrowDown') {
      event.preventDefault();
      this.moverIndiceResaltado(1);
      return;
    }

    if (event.key === 'ArrowUp') {
      event.preventDefault();
      this.moverIndiceResaltado(-1);
      return;
    }

    if (event.key === 'Enter') {
      event.preventDefault();
      const producto = this.productosDropdownActivos[this.indiceProductoResaltado];
      if (producto) {
        this.seleccionarProductoDesdeDropdown(producto);
      }
      return;
    }

    if (event.key === 'Escape') {
      event.preventDefault();
      this.cerrarDropdownProducto();
    }
  }

  actualizarFiltroProductoActivo(valor: string): void {
    if (this.activeDropdownIndex === null) {
      return;
    }

    const fila = this.ventas[this.activeDropdownIndex];
    if (!fila) {
      return;
    }

    fila.filtroProducto = valor;
    this.indiceProductoResaltado = 0;
    this.reposicionarDropdownActivo();
  }

  seleccionarProductoDesdeDropdown(producto: Producto): void {
    if (this.activeDropdownIndex === null) {
      return;
    }

    this.seleccionarProducto(this.activeDropdownIndex, producto);
  }

  seleccionarProducto(index: number, producto: Producto): void {
    const fila = this.ventas[index];
    if (!fila) {
      return;
    }

    if (!this.tieneLoteRegistrado(producto.id)) {
      window.alert(`El producto "${producto.nombre}" no tiene lote registrado. Registra un lote antes de vender.`);
      return;
    }

    const stockDisponible = this.stockDisponiblePorProducto.get(producto.id) ?? 0;
    if (stockDisponible <= 0) {
      this.mostrarAlertaStockAgotado(producto.nombre);
      return;
    }

    fila.productoId = producto.id;
    fila.productoNombre = producto.nombre;
    fila.grupoVenta = producto.grupo_venta;
    fila.filtroProducto = '';
    fila.dropdownAbierto = false;
    this.actualizarAdvertenciaStock(index);
    this.cerrarDropdownProducto();
    this.programarGuardado();
  }

  productosFiltrados(index: number): Producto[] {
    const productosConLote = this.productos.filter((producto) => this.tieneLoteRegistrado(producto.id));
    const fila = this.ventas[index];
    if (!fila) {
      return productosConLote;
    }

    const valor = fila.filtroProducto.trim().toLowerCase();
    if (!valor) {
      return productosConLote;
    }

    return productosConLote.filter((producto) => producto.nombre.toLowerCase().includes(valor));
  }

  @HostListener('document:click', ['$event'])
  cerrarDropdownExterno(event: MouseEvent): void {
    const target = event.target as HTMLElement;
    if (target.closest('.selector-producto') || target.closest('.selector-producto__overlay')) {
      return;
    }

    this.cerrarDropdownProducto();
  }

  private abrirDropdownProducto(index: number, trigger: HTMLElement): void {
    this.activeDropdownIndex = index;
    this.triggerDropdownActivo = trigger;
    const productos = this.productosFiltrados(index);
    const productoSeleccionado = this.ventas[index]?.productoId ?? null;
    const indiceSeleccionado = productos.findIndex((producto) => producto.id === productoSeleccionado);
    this.indiceProductoResaltado = indiceSeleccionado >= 0 ? indiceSeleccionado : 0;

    this.reposicionarDropdownActivo();
    this.registrarListenersReubicacion();

    setTimeout(() => {
      this.buscadorDropdown?.nativeElement.focus();
      this.buscadorDropdown?.nativeElement.select();
    });
  }

  private cerrarDropdownProducto(): void {
    this.activeDropdownIndex = null;
    this.triggerDropdownActivo = null;
    this.indiceProductoResaltado = 0;
    this.desregistrarListenersReubicacion();
  }

  private moverIndiceResaltado(delta: number): void {
    const total = this.productosDropdownActivos.length;
    if (total === 0) {
      this.indiceProductoResaltado = 0;
      return;
    }

    const siguiente = (this.indiceProductoResaltado + delta + total) % total;
    this.indiceProductoResaltado = siguiente;
  }

  private reposicionarDropdownActivo(): void {
    if (!this.dropdownAbierto || !this.triggerDropdownActivo) {
      return;
    }

    if (!this.triggerDropdownActivo.isConnected) {
      this.cerrarDropdownProducto();
      return;
    }

    const rect = this.triggerDropdownActivo.getBoundingClientRect();
    const viewportHeight = window.innerHeight;
    const viewportWidth = window.innerWidth;
    const espacioAbajo = viewportHeight - rect.bottom - this.panelMargin;
    const espacioArriba = rect.top - this.panelMargin;

    const abrirHaciaArriba = espacioAbajo < 220 && espacioArriba > espacioAbajo;
    const maxHeightDisponible = Math.max(
      this.panelMinHeight,
      Math.min(this.panelMaxHeight, abrirHaciaArriba ? espacioArriba : espacioAbajo)
    );

    const width = Math.min(rect.width, viewportWidth - this.panelMargin * 2);
    const left = Math.min(Math.max(this.panelMargin, rect.left), viewportWidth - width - this.panelMargin);
    const top = abrirHaciaArriba
      ? Math.max(this.panelMargin, rect.top - maxHeightDisponible - this.panelMargin)
      : Math.min(viewportHeight - maxHeightDisponible - this.panelMargin, rect.bottom + this.panelMargin);

    this.dropdownAbrirHaciaArriba = abrirHaciaArriba;
    this.dropdownPosicion = {
      top,
      left,
      width,
      maxHeight: maxHeightDisponible
    };
  }

  private registrarListenersReubicacion(): void {
    window.addEventListener('resize', this.onWindowResize);
    window.addEventListener('scroll', this.onWindowScroll, true);
  }

  private desregistrarListenersReubicacion(): void {
    window.removeEventListener('resize', this.onWindowResize);
    window.removeEventListener('scroll', this.onWindowScroll, true);
  }

  private cargarProductos(): void {
    const headers = this.obtenerHeaders();
    this.http.get<ProductoApi[]>('/api/otros-productos/productos', { headers }).subscribe({
      next: (productos) => {
        this.productos = productos;
      },
      error: () => {
        this.mensajeError = 'No pudimos cargar los productos para ventas diarias.';
      }
    });
  }

  private cargarLotesDisponibles(): void {
    const headers = this.obtenerHeaders();
    this.http.get<LoteApi[]>('/api/otros-productos/lotes', { headers }).subscribe({
      next: (lotes) => {
        const abiertos = lotes.filter((lote) => lote.estado === 'ABIERTO');
        this.productoIdsConLote = new Set(abiertos.map((lote) => lote.producto_id));
        this.stockDisponiblePorProducto = abiertos.reduce((mapa, lote) => {
          const actual = mapa.get(lote.producto_id) ?? 0;
          mapa.set(lote.producto_id, actual + Number(lote.cantidad ?? 0));
          return mapa;
        }, new Map<number, number>());
      },
      error: () => {
        this.productoIdsConLote = new Set();
      }
    });
  }

  private cargarEstadoFecha(): void {
    const headers = this.obtenerHeaders();
    const params = new HttpParams().set('fecha', this.fechaHoy);

    this.http.get<EstadoVentaApi>('/api/otros-productos/ventas-diarias', { headers, params }).subscribe({
      next: (estado) => {
        const filasIncompletasLocales = this.ventas.filter((fila) => !fila.productoId || this.parseNumero(fila.cantidad) <= 0);
        const filasAbiertas = (estado.filas ?? []).filter((item) => !item.cerrado_en);
        const filas = filasAbiertas.map((item) => ({
          ventaId: item.venta_op_diaria_id,
          fechaHora: this.formatearFechaHoraInput(item.fecha_hora),
          productoId: item.producto_id,
          productoNombre: item.producto_nombre,
          grupoVenta: item.grupo_venta,
          filtroProducto: item.producto_nombre,
          dropdownAbierto: false,
          cantidad: String(item.cantidad ?? ''),
          precio: String(item.precio ?? '')
        }));

        if (filas.length > 0) {
          this.fechaHoraActual = filas[0].fechaHora || this.fechaHoraActual;
        }

        const filasCombinadas = [...filas, ...filasIncompletasLocales.filter((fila) => !fila.ventaId)];
        this.ventas = filasCombinadas;
        this.cerrado = filasAbiertas.length === 0 && (estado.filas ?? []).some((item) => !!item.cerrado_en);
        this.cierresHistoricos = (estado.cierres ?? []).map((cierre) => ({
          fecha: cierre.fecha,
          cerrado_en: cierre.cerrado_en,
          total_huevos: Number(cierre.total_huevos ?? 0),
          total_congelados: Number(cierre.total_congelados ?? 0),
          total_general: Number(cierre.total_general ?? 0),
          items: (cierre.items ?? []).map((item) => ({
            ventaOpDiariaId: item.venta_op_diaria_id,
            fechaHora: item.fecha_hora,
            productoNombre: item.producto_nombre,
            cantidad: Number(item.cantidad ?? 0),
            precio: Number(item.precio ?? 0),
            total: Number(item.total ?? 0),
            categoria: item.grupo_venta ?? 'OTROS'
          }))
        }));

        this.filaAdvertenciaStock = null;
        this.ventas.forEach((_, index) => this.actualizarAdvertenciaStock(index));
      },
      error: () => {
        this.fechaHoraActual = this.obtenerFechaHoraLocalInput();
        this.fechaHoy = this.fechaHoraActual.slice(0, 10);
        this.ventas = [];
      }
    });
  }

  private guardarBorrador(): void {
    if (this.cerrado) {
      return;
    }

    const filasSinLote = this.ventas.filter((fila) => fila.productoId && !this.tieneLoteRegistrado(fila.productoId));
    if (filasSinLote.length > 0) {
      window.alert('Hay productos sin lote registrado. No se guardó el registro de ventas diarias.');
      return;
    }

    const filasValidas = this.ventas
      .filter((fila) => fila.productoId && this.parseNumero(fila.cantidad) > 0 && this.parseNumero(fila.precio) >= 0)
      .map((fila) => ({
        producto_id: fila.productoId,
        cantidad: this.parseNumero(fila.cantidad),
        precio: this.parseNumero(fila.precio),
        fecha_hora: this.formatearFechaHoraApi(fila.fechaHora)
      }));

    this.guardando = true;
    const headers = this.obtenerHeaders();
    this.http.put('/api/otros-productos/ventas-diarias', {
      fecha: this.fechaHoy,
      filas: filasValidas
    }, { headers }).subscribe({
      next: () => {
        this.guardando = false;
      },
      error: () => {
        this.guardando = false;
      }
    });
  }

  private programarGuardado(): void {
    this.guardado$.next();
  }


  private iniciarSincronizacionAutomatica(): void {
    this.syncIntervalId = setInterval(() => {
      this.cargarLotesDisponibles();
      if (!this.dropdownAbierto && !this.guardando) {
        this.cargarEstadoFecha();
      }
    }, 15000);
  }

  private iniciarRelojFechaHora(): void {
    const tick = () => {
      const ahora = this.obtenerFechaHoraLocalInput();
      const fechaAnterior = this.fechaHoy;
      this.fechaHoraActual = ahora;
      this.fechaHoy = ahora.slice(0, 10);

      if (fechaAnterior && fechaAnterior !== this.fechaHoy) {
        this.cerrado = false;
        this.ventas = [];
        this.cargarEstadoFecha();
      }
    };

    tick();
    this.relojIntervalId = setInterval(() => {
      tick();
    }, 60000);
  }

  private parseNumero(valor: string | number | null | undefined): number {
    if (typeof valor === 'number') {
      return Number.isFinite(valor) ? valor : 0;
    }

    if (!valor) {
      return 0;
    }

    const normalizado = String(valor).replace(',', '.');
    const numero = Number(normalizado);
    return Number.isFinite(numero) ? numero : 0;
  }

  private normalizarEntradaDecimal(valor: string | null | undefined): string {
    if (valor == null) {
      return '';
    }

    const soloCaracteresValidos = valor.replace(/[^\d.,]/g, '');
    const conPuntoDecimal = soloCaracteresValidos.replace(',', '.');
    const [parteEntera = '', ...restoDecimales] = conPuntoDecimal.split('.');
    const parteDecimal = restoDecimales.join('');

    if (restoDecimales.length === 0) {
      return parteEntera;
    }

    return `${parteEntera}.${parteDecimal}`;
  }

  private tieneLoteRegistrado(productoId: number): boolean {
    return this.productoIdsConLote.has(productoId);
  }

  private obtenerNombreUsuario(): string {
    const usuario = this.sesionServicio.obtenerUsuario();
    return usuario?.name?.trim() || usuario?.usuario?.trim() || usuario?.email?.trim() || 'Usuario';
  }

  private obtenerHeaders(): HttpHeaders {
    const token = this.sesionServicio.obtenerToken();
    return token ? new HttpHeaders({ Authorization: `Bearer ${token}` }) : new HttpHeaders();
  }

  private obtenerFechaLocalISO(): string {
    const ahora = new Date();
    const offset = ahora.getTimezoneOffset() * 60000;
    return new Date(ahora.getTime() - offset).toISOString().slice(0, 10);
  }

  private obtenerFechaHoraLocalInput(): string {
    const ahora = new Date();
    const offset = ahora.getTimezoneOffset() * 60000;
    const local = new Date(ahora.getTime() - offset).toISOString();
    return local.slice(0, 16);
  }

  private combinarFechaConHoraActual(fecha: string): string {
    const hora = this.obtenerFechaHoraLocalInput().slice(11, 16);
    return `${fecha}T${hora}`;
  }

  puedeReabrirDia(cierre: CierreHistorico): boolean {
    return cierre.fecha === this.fechaHoy;
  }

  private formatearFechaHoraInput(valor: string | null | undefined): string {
    if (!valor) {
      return this.obtenerFechaHoraLocalInput();
    }

    const normalizado = valor.replace(' ', 'T');
    return normalizado.slice(0, 16);
  }

  private formatearFechaHoraApi(valor: string): string {
    if (!valor) {
      return `${this.obtenerFechaHoraLocalInput().replace('T', ' ')}:00`;
    }
    return `${valor.replace('T', ' ')}:00`;
  }
}
