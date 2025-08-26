import { Component, ElementRef, ViewChild } from '@angular/core';
import { FormsModule } from '@angular/forms'; // Importar para ngModel
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-floyd',
  standalone: true,
  imports: [FormsModule, CommonModule],
  templateUrl: './floyd.component.html',
  styleUrls: ['./floyd.component.css']
})
export class FloydComponent {
  // Referencia al canvas
  @ViewChild('canvas', { static: false }) canvasRef!: ElementRef<HTMLCanvasElement>;
  private ctx!: CanvasRenderingContext2D | null;

  // Variables para matriz
  numNodos: number = 3;
  matriz: number[][] = [];
  previewMatrizHtml: string = '';
  iteracionesCanvasHtml: string = '';
  resultadoCanvasHtml: string = '';

  // Lista de nodos para dibujar
  nodos: { x: number, y: number, nombre: string }[] = [];

  ngAfterViewInit() {
    this.ctx = this.canvasRef.nativeElement.getContext('2d');
    this.generarMatriz();
  }

  generarMatriz() {
    this.matriz = Array.from({ length: this.numNodos }, () =>
      Array(this.numNodos).fill(Infinity)
    );
    for (let i = 0; i < this.numNodos; i++) {
      this.matriz[i][i] = 0;
    }
  }

  onCanvasClick(event: MouseEvent) {
    const rect = this.canvasRef.nativeElement.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    const nombre = `N${this.nodos.length + 1}`;
    this.nodos.push({ x, y, nombre });
    this.dibujar();
  }

  dibujar() {
    if (!this.ctx) return;
    this.ctx.clearRect(0, 0, 900, 540);

    for (let nodo of this.nodos) {
      this.ctx.beginPath();
      this.ctx.arc(nodo.x, nodo.y, 20, 0, Math.PI * 2);
      this.ctx.fillStyle = 'lightblue';
      this.ctx.fill();
      this.ctx.stroke();
      this.ctx.fillStyle = 'black';
      this.ctx.fillText(nodo.nombre, nodo.x - 5, nodo.y + 5);
    }
  }

  previsualizarMatriz() {
    let html = `<table border="1" cellpadding="5">`;
    for (let i = 0; i < this.matriz.length; i++) {
      html += `<tr>`;
      for (let j = 0; j < this.matriz[i].length; j++) {
        html += `<td>${this.matriz[i][j] === Infinity ? '∞' : this.matriz[i][j]}</td>`;
      }
      html += `</tr>`;
    }
    html += `</table>`;
    this.previewMatrizHtml = html;
  }

  ejecutarFloydCanvas() {
    let dist = JSON.parse(JSON.stringify(this.matriz));

    const n = dist.length;
    let iteraciones = '';
    for (let k = 0; k < n; k++) {
      for (let i = 0; i < n; i++) {
        for (let j = 0; j < n; j++) {
          if (dist[i][k] + dist[k][j] < dist[i][j]) {
            dist[i][j] = dist[i][k] + dist[k][j];
          }
        }
      }
      iteraciones += `<p>Iteración ${k + 1}</p>`;
      iteraciones += '<pre>' + JSON.stringify(dist, null, 2) + '</pre>';
    }
    this.iteracionesCanvasHtml = iteraciones;

    this.resultadoCanvasHtml = `<h5>Resultado final</h5><pre>${JSON.stringify(dist, null, 2)}</pre>`;
  }
}
