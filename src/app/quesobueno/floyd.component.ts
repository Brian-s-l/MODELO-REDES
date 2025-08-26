import { Component, ElementRef, ViewChild, AfterViewInit, AfterViewChecked, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-floyd',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './floyd.component.html',
  styleUrls: ['./floyd.component.css']
})
export class FloydComponent implements AfterViewInit, AfterViewChecked {
  modo: 'matriz' | 'canvas' = 'matriz';

  numNodos: number = 0;
  // nueva representación reactiva de la matriz y nombres
  matriz: (number | string)[][] = [];
  nombres: string[] = [];

  // salidas (HTML ya generadas por tus funciones)
  iteracionesHtml: string = '';
  resultadoHtml: string = '';

  previewCanvasHtml: string = '';
  iteracionesCanvasHtml: string = '';
  resultadoCanvasHtml: string = '';

  canvasSelectNames: string[] = [];

  @ViewChild('canvas', { static: false }) canvasRef!: ElementRef<HTMLCanvasElement>;
  ctx!: CanvasRenderingContext2D | null;

  nodos: { nombre: string; x: number; y: number }[] = [];
  aristas: { from: number; to: number; peso: number; direccion: 'forward' | 'both' }[] = [];
  seleccion1: number | null = null;

  acciones: any[] = [];
  rehacerAcciones: any[] = [];
  imagenFondo: HTMLImageElement | null = null;

  ultimoFloyd: { nombres: string[]; dist: number[][]; next: number[][] | null } | null = null;
  aristasCaminoFinal: [number, number][] = [];
  nodosCaminoFinal: number[] = [];

  origenCanvas: number = 0;
  destinoCanvas: number = 0;

  readonly INF = Infinity;
  readonly radio = 22;

  ngAfterViewInit() {
    this.initCanvasIfPresent();
  }

  ngAfterViewChecked() {
    this.initCanvasIfPresent();
  }

  private initCanvasIfPresent() {
    try {
      if (!this.canvasRef) return;
      const canvas = this.canvasRef.nativeElement;
      if (!canvas) return;
      if (!this.ctx) {
        const ctx = canvas.getContext('2d');
        if (ctx) {
          this.ctx = ctx;
          this.dibujarGrafo(this.aristasCaminoFinal, this.nodosCaminoFinal);
        }
      }
    } catch (err) {
      console.debug('initCanvasIfPresent:', err);
    }
  }

  @HostListener('window:resize')
  onResize() {
    this.dibujarGrafo(this.aristasCaminoFinal, this.nodosCaminoFinal);
  }

  /***********************
   * UTILIDADES GENERALES
   ***********************/
  generarTabla(matrix: number[][], nombres: string[]): string {
    let html = `<table class="table table-bordered table-sm"><thead><tr><th></th>`;
    for (let j = 0; j < nombres.length; j++) html += `<th>${nombres[j]}</th>`;
    html += `</tr></thead><tbody>`;
    for (let i = 0; i < nombres.length; i++) {
      html += `<tr><th>${nombres[i]}</th>`;
      for (let j = 0; j < nombres.length; j++) {
        html += `<td>${matrix[i][j] === this.INF ? "∞" : matrix[i][j]}</td>`;
      }
      html += `</tr>`;
    }
    html += `</tbody></table>`;
    return html;
  }

  reconstruirRuta(i: number, j: number, next: any[][], nombres: string[]): string[] {
    if (!next || next[i][j] === null) return [];
    let ruta = [nombres[i]];
    while (i !== j) {
      i = next[i][j];
      ruta.push(nombres[i]);
    }
    return ruta;
  }

  floydWarshall(dist: number[][], nombres: string[]) {
    const n = dist.length;
    const next: any[][] = Array.from({ length: n }, () => Array(n).fill(null));
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        if (i !== j && dist[i][j] !== this.INF) next[i][j] = j;
      }
    }

    let iteracionesHtml = "";
    for (let k = 0; k < n; k++) {
      for (let i = 0; i < n; i++) {
        for (let j = 0; j < n; j++) {
          const alt = (dist[i][k] === this.INF || dist[k][j] === this.INF) ? this.INF : dist[i][k] + dist[k][j];
          if (alt < dist[i][j]) {
            dist[i][j] = alt;
            next[i][j] = next[i][k];
          }
        }
      }
      iteracionesHtml += `<div class="iteration"><h5>Iteración ${k + 1} (Nodo intermedio: ${nombres[k]})</h5>${this.generarTabla(dist, nombres)}</div>`;
    }
    return { dist, next, iterHTML: iteracionesHtml };
  }

  /***********************
   * MATRIZ (reactiva con ngModel)
   ***********************/
  generarMatriz() {
    if (!this.numNodos || this.numNodos <= 0) {
      alert("Ingrese un número válido de nodos");
      return;
    }
    // nombres por defecto
    this.nombres = Array.from({ length: this.numNodos }, (_, i) => "N" + (i + 1));
    // matriz inicial: 0 en diagonal, '' (vacío = ∞) fuera diagonal
    this.matriz = Array.from({ length: this.numNodos }, (_, i) =>
      Array.from({ length: this.numNodos }, (_, j) => (i === j ? 0 : ""))
    );
    this.iteracionesHtml = '';
    this.resultadoHtml = '';
  }

  ejecutarFloydDesdeMatriz() {
    const n = Number(this.numNodos);
    if (isNaN(n) || n <= 0 || this.matriz.length !== n) {
      alert("Primero genere la matriz con un número válido de nodos.");
      return;
    }

    // recopilar nombres: si el usuario los editó en el template, están en this.nombres
    const nombres: string[] = this.nombres.map((nm, idx) => (nm && nm.trim()) ? nm.trim() : ("N" + (idx + 1)));

    // construir dist con reglas: '' o '∞' o null => INF
    let dist: number[][] = Array.from({ length: n }, () => Array(n).fill(this.INF));
    for (let i = 0; i < n; i++) dist[i][i] = 0;

    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        const raw = this.matriz[i][j];
        if (i === j) { dist[i][j] = 0; continue; }
        if (raw === "" || raw === null || raw === undefined) continue;
        // aceptar símbolo infinito '∞' o 'inf' también
        if (typeof raw === "string" && (raw.trim() === "" || raw.trim() === "∞" || raw.trim().toLowerCase() === "inf")) continue;
        const num = typeof raw === "number" ? raw : parseFloat(String(raw));
        if (!isNaN(num)) dist[i][j] = num;
      }
    }

    const { dist: D, next, iterHTML } = this.floydWarshall(dist, nombres);
    this.iteracionesHtml = iterHTML;

    let resultadoHtml = `<div class="result-paths"><h4>Rutas más cortas finales</h4><ul>`;
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        if (i === j) continue;
        if (D[i][j] === this.INF) {
          resultadoHtml += `<li>${nombres[i]} → ${nombres[j]}: No hay camino</li>`;
        } else {
          const ruta = this.reconstruirRuta(i, j, next, nombres);
          resultadoHtml += `<li>${nombres[i]} → ${nombres[j]} = ${D[i][j]} | Ruta: ${ruta.join(" → ")}</li>`;
        }
      }
    }
    resultadoHtml += `</ul></div>`;
    this.resultadoHtml = resultadoHtml;

    this.ultimoFloyd = { nombres, dist: D, next };
    this.actualizarSelectsCanvasDesdeNombres(nombres);
  }

  /***********************
   * CANVAS: dibujado y eventos (se mantiene tu lógica)
   ***********************/
  private drawArrow(x1: number, y1: number, x2: number, y2: number, color = "black", ctxDraw?: CanvasRenderingContext2D, lw = 2) {
    const ctx = ctxDraw || (this.ctx as CanvasRenderingContext2D);
    if (!ctx) return;
    const dx = x2 - x1, dy = y2 - y1;
    const len = Math.hypot(dx, dy);
    if (len === 0) return;
    const ux = dx / len, uy = dy / len;
    const startX = x1 + ux * this.radio;
    const startY = y1 + uy * this.radio;
    const endX = x2 - ux * this.radio;
    const endY = y2 - uy * this.radio;
    ctx.save();
    ctx.strokeStyle = color;
    ctx.fillStyle = color;
    ctx.lineWidth = lw;
    ctx.beginPath();
    ctx.moveTo(startX, startY);
    ctx.lineTo(endX, endY);
    ctx.stroke();
    const headLen = 12;
    const angle = Math.atan2(dy, dx);
    ctx.beginPath();
    ctx.moveTo(endX, endY);
    ctx.lineTo(endX - headLen * Math.cos(angle - Math.PI / 6),
      endY - headLen * Math.sin(angle - Math.PI / 6));
    ctx.lineTo(endX - headLen * Math.cos(angle + Math.PI / 6),
      endY - headLen * Math.sin(angle + Math.PI / 6));
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  dibujarGrafo(aristasResaltadas: [number, number][] = [], nodosResaltados: number[] = [], ctxDraw?: CanvasRenderingContext2D) {
    if (!this.canvasRef) return;
    this.initCanvasIfPresent();
    if (!this.ctx) return;

    const ctx = ctxDraw || (this.ctx as CanvasRenderingContext2D);
    const canvas = this.canvasRef.nativeElement;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    if (this.imagenFondo) ctx.drawImage(this.imagenFondo, 0, 0, canvas.width, canvas.height);

    // aristas
    this.aristas.forEach(({ from, to, peso, direccion }) => {
      if (direccion === "forward") {
        this.drawArrow(this.nodos[from].x, this.nodos[from].y, this.nodos[to].x, this.nodos[to].y, "#000", ctx);
      } else if (direccion === "both") {
        this.drawArrow(this.nodos[from].x, this.nodos[from].y, this.nodos[to].x, this.nodos[to].y, "#000", ctx);
        this.drawArrow(this.nodos[to].x, this.nodos[to].y, this.nodos[from].x, this.nodos[from].y, "#000", ctx);
      }
      const px = (this.nodos[from].x + this.nodos[to].x) / 2;
      const py = (this.nodos[from].y + this.nodos[to].y) / 2;
      ctx.fillStyle = "lightblue";
      ctx.strokeStyle = "black";
      ctx.fillRect(px - 12, py - 12, 24, 24);
      ctx.strokeRect(px - 12, py - 12, 24, 24);
      ctx.fillStyle = "black";
      ctx.font = "12px Arial";
      ctx.fillText(String(peso), px - 6, py + 4);
    });

    // resaltar aristas
    aristasResaltadas.forEach(([f, t]) => {
      this.drawArrow(this.nodos[f].x, this.nodos[f].y, this.nodos[t].x, this.nodos[t].y, "red", ctx, 3);
    });

    // nodos
    this.nodos.forEach((n, i) => {
      ctx.beginPath();
      ctx.arc(n.x, n.y, this.radio, 0, Math.PI * 2);
      ctx.fillStyle = nodosResaltados.includes(i) ? "red" : "white";
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = nodosResaltados.includes(i) ? "white" : "black";
      ctx.font = "13px Arial";
      ctx.fillText(n.nombre, n.x - 6, n.y + 5);
    });
  }

  canvasClick(event: MouseEvent) {
    this.initCanvasIfPresent();
    if (!this.canvasRef) return;
    const canvas = this.canvasRef.nativeElement;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    const i = this.nodos.findIndex(n => Math.hypot(n.x - x, n.y - y) < this.radio);

    if (i === -1) {
      // crea nodo
      const nombre = String.fromCharCode(65 + this.nodos.length);
      const nuevoNodo = { nombre, x, y };
      this.nodos.push(nuevoNodo);
      this.guardarAccion("nodo", nuevoNodo);
      this.actualizarSelectsCanvas();
    } else {
      // seleccionó un nodo existente
      if (this.seleccion1 === null) {
        this.seleccion1 = i;
      } else {
        if (this.seleccion1 !== i) {
          const pesoStr = prompt("Peso de la arista (número):");
          const p = parseFloat(String(pesoStr));
          if (!isNaN(p)) {
            const dir = prompt(
              "Dirección de la arista:\n" +
              "1 = " + this.nodos[this.seleccion1].nombre + " → " + this.nodos[i].nombre +
              "\n2 = " + this.nodos[i].nombre + " → " + this.nodos[this.seleccion1].nombre +
              "\n3 = Bidireccional"
            );
            let nuevaArista: any = null;
            if (dir === "1") {
              nuevaArista = { from: this.seleccion1, to: i, peso: p, direccion: "forward" as const };
            } else if (dir === "2") {
              nuevaArista = { from: i, to: this.seleccion1, peso: p, direccion: "forward" as const };
            } else if (dir === "3") {
              nuevaArista = { from: this.seleccion1, to: i, peso: p, direccion: "both" as const };
            }
            if (nuevaArista) {
              this.aristas.push(nuevaArista);
              this.guardarAccion("arista", nuevaArista);
            }
          } else {
            alert("Peso inválido.");
          }
        }
        this.seleccion1 = null;
      }
    }
    this.aristasCaminoFinal = [];
    this.nodosCaminoFinal = [];
    this.dibujarGrafo();
  }

  cargarFondo(e: any) {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event: any) => {
      const img = new Image();
      img.onload = () => { this.imagenFondo = img; this.dibujarGrafo(this.aristasCaminoFinal, this.nodosCaminoFinal); };
      img.src = event.target.result;
    };
    reader.readAsDataURL(file);
  }
  quitarFondo() { this.imagenFondo = null; this.dibujarGrafo(this.aristasCaminoFinal, this.nodosCaminoFinal); }

  guardarAccion(tipo: string, data: any) {
    this.acciones.push({ tipo, data: JSON.parse(JSON.stringify(data)) });
    this.rehacerAcciones.length = 0;
  }

  undo() {
    if (this.acciones.length === 0) return;
    const a = this.acciones.pop();
    this.rehacerAcciones.push(JSON.parse(JSON.stringify(a)));
    if (a.tipo === "nodo") this.nodos.pop();
    else if (a.tipo === "arista") this.aristas.pop();
    this.actualizarSelectsCanvas();
    this.dibujarGrafo(this.aristasCaminoFinal, this.nodosCaminoFinal);
  }

  redo() {
    if (this.rehacerAcciones.length === 0) return;
    const a = this.rehacerAcciones.pop();
    this.acciones.push(JSON.parse(JSON.stringify(a)));
    if (a.tipo === "nodo") this.nodos.push(a.data);
    else if (a.tipo === "arista") this.aristas.push(a.data);
    this.actualizarSelectsCanvas();
    this.dibujarGrafo(this.aristasCaminoFinal, this.nodosCaminoFinal);
  }

  construirMatrizDesdeGrafo() {
    const n = this.nodos.length;
    const nombres = this.nodos.map(n => n.nombre);
    const dist = Array.from({ length: n }, () => Array(n).fill(this.INF));
    for (let i = 0; i < n; i++) dist[i][i] = 0;

    this.aristas.forEach(({ from, to, peso, direccion }) => {
      if (direccion === "forward" || direccion === "both") {
        dist[from][to] = Math.min(dist[from][to], peso);
      }
      if (direccion === "both") {
        dist[to][from] = Math.min(dist[to][from], peso);
      }
    });
    return { nombres, dist };
  }

  previsualizarMatrizCanvas() {
    if (this.nodos.length === 0) { this.previewCanvasHtml = `<div class="alert alert-warning">No hay nodos.</div>`; return; }
    const { nombres, dist } = this.construirMatrizDesdeGrafo();
    const html = `<h4>Matriz desde grafo</h4>${this.generarTabla(dist, nombres)}`;
    this.previewCanvasHtml = html;
  }

  generarDesdeCanvas() {
    const n = this.nodos.length;
    if (n === 0) { alert("No hay nodos en el Canvas."); return; }
    this.numNodos = n;
    // llenar nombres según nodos
    this.nombres = this.nodos.map(nod => nod.nombre || ("N" + (this.nodos.indexOf(nod) + 1)));
    // construir matriz desde grafo (numérico y ∞ donde no hay arista)
    const { dist } = this.construirMatrizDesdeGrafo();
    this.matriz = Array.from({ length: n }, (_, i) =>
      Array.from({ length: n }, (_, j) => (dist[i][j] === this.INF ? "" : dist[i][j]))
    );
    // cambiar a modo matriz y scrollear
    this.modo = 'matriz';
    this.iteracionesHtml = '';
    this.resultadoHtml = '';
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  ejecutarFloydCanvas() {
    if (this.nodos.length === 0) { this.resultadoCanvasHtml = `<div class="alert alert-warning">No hay nodos/aristas.</div>`; return; }
    const { nombres, dist } = this.construirMatrizDesdeGrafo();
    const { dist: D, next, iterHTML } = this.floydWarshall(dist, nombres);
    this.iteracionesCanvasHtml = iterHTML;

    let resultadoHtml = `<div class="result-paths"><h4>Rutas más cortas finales</h4><ul>`;
    for (let i = 0; i < nombres.length; i++) {
      for (let j = 0; j < nombres.length; j++) {
        if (i === j) continue;
        if (D[i][j] === this.INF) {
          resultadoHtml += `<li>${nombres[i]} → ${nombres[j]}: No hay camino</li>`;
        } else {
          const ruta = this.reconstruirRuta(i, j, next, nombres);
          resultadoHtml += `<li>${nombres[i]} → ${nombres[j]} = ${D[i][j]} | Ruta: ${ruta.join(" → ")}</li>`;
        }
      }
    }
    resultadoHtml += `</ul></div>`;
    this.resultadoCanvasHtml = resultadoHtml;

    this.ultimoFloyd = { nombres, dist: D, next };
    this.actualizarSelectsCanvasDesdeNombres(nombres);
  }

  actualizarSelectsCanvas() {
    this.canvasSelectNames = this.nodos.map(n => n.nombre);
    if (this.origenCanvas >= this.canvasSelectNames.length) this.origenCanvas = 0;
    if (this.destinoCanvas >= this.canvasSelectNames.length) this.destinoCanvas = 0;
  }

  actualizarSelectsCanvasDesdeNombres(nombres: string[]) {
    this.canvasSelectNames = nombres.slice();
    if (this.origenCanvas >= nombres.length) this.origenCanvas = 0;
    if (this.destinoCanvas >= nombres.length) this.destinoCanvas = 0;
  }

  resaltarRuta() {
    if (!this.ultimoFloyd) { alert("Primero ejecuta Floyd (desde Matriz o desde Canvas)."); return; }
    const o = Number(this.origenCanvas);
    const d = Number(this.destinoCanvas);
    if (isNaN(o) || isNaN(d) || o === d) { alert("Selecciona origen y destino distintos."); return; }

    const nombresF = this.ultimoFloyd.nombres;
    const rutaNombres = this.reconstruirRuta(o, d, (this.ultimoFloyd as any).next, nombresF);
    if (!rutaNombres || rutaNombres.length === 0) {
      alert("No hay camino para ese par según Floyd.");
      this.aristasCaminoFinal = []; this.nodosCaminoFinal = []; this.dibujarGrafo();
      return;
    }

    const nameToIndex: Record<string, number> = {};
    this.nodos.forEach((n, i) => { nameToIndex[n.nombre] = i; });

    const indicesLocales: number[] = [];
    let mapeoOk = true;
    for (const nombre of rutaNombres) {
      if (nameToIndex.hasOwnProperty(nombre)) indicesLocales.push(nameToIndex[nombre]);
      else { mapeoOk = false; break; }
    }

    if (!mapeoOk) {
      alert("No pude mapear los nombres de la ruta al canvas actual. Ejecuta Floyd desde el grafo para evitar desajustes.");
      return;
    }

    this.aristasCaminoFinal = [];
    for (let i = 1; i < indicesLocales.length; i++) {
      this.aristasCaminoFinal.push([indicesLocales[i - 1], indicesLocales[i]]);
    }
    this.nodosCaminoFinal = indicesLocales;
    this.dibujarGrafo(this.aristasCaminoFinal, this.nodosCaminoFinal);
  }
}
