import { Component, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-dijkstra',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './dijkstra.component.html',
  styleUrls: ['./dijkstra.component.css']
})
export class DijkstraComponent implements AfterViewInit {

  ngAfterViewInit(): void {
    this.initDijkstra();
  }

  initDijkstra() {
    const canvas = document.getElementById("canvas") as HTMLCanvasElement;
    const ctx = canvas.getContext("2d")!;
    const radio = 20;

    let nodos: any[] = [];
    let aristas: any[] = [];
    let seleccion1: number | null = null;
    const acciones: any[] = [];
    const rehacerAcciones: any[] = [];
    let imagenFondo: HTMLImageElement | null = null;

    // Iteraciones / snapshots
    let logIteraciones: any[] = [];
    let snapshots: any[] = [];
    let aristasCaminoFinal: any[] = [];
    let nodosCaminoFinal: any[] = [];

    // --- Utilidades ---
    function guardarAccion(tipo: string, data: any) {
      acciones.push({ tipo, data: JSON.parse(JSON.stringify(data)) });
      rehacerAcciones.length = 0;
    }

    function actualizarSelects() {
      ["origen", "destino"].forEach(id => {
        const sel = document.getElementById(id) as HTMLSelectElement;
        sel.innerHTML = "";
        nodos.forEach((n, i) => sel.innerHTML += `<option value="${i}">${n.nombre}</option>`);
      });
    }

    // --- Dibujo ---
    function drawArrow(x1: number, y1: number, x2: number, y2: number, color = "black", ctxDraw = ctx) {
      const dx = x2 - x1, dy = y2 - y1;
      const len = Math.hypot(dx, dy);
      if (len === 0) return;
      const ux = dx / len, uy = dy / len;
      const startX = x1 + ux * radio;
      const startY = y1 + uy * radio;
      const endX = x2 - ux * radio;
      const endY = y2 - uy * radio;

      ctxDraw.save();
      ctxDraw.strokeStyle = color;
      ctxDraw.fillStyle = color;
      ctxDraw.lineWidth = 2;

      ctxDraw.beginPath();
      ctxDraw.moveTo(startX, startY);
      ctxDraw.lineTo(endX, endY);
      ctxDraw.stroke();

      const headLen = 10;
      const angle = Math.atan2(dy, dx);
      ctxDraw.beginPath();
      ctxDraw.moveTo(endX, endY);
      ctxDraw.lineTo(endX - headLen * Math.cos(angle - Math.PI / 6),
        endY - headLen * Math.sin(angle - Math.PI / 6));
      ctxDraw.lineTo(endX - headLen * Math.cos(angle + Math.PI / 6),
        endY - headLen * Math.sin(angle + Math.PI / 6));
      ctxDraw.closePath();
      ctxDraw.fill();
      ctxDraw.restore();
    }

    function dibujarGrafo(aristasResaltadas: any[] = [], nodosResaltados: any[] = [], ctxDraw = ctx, snapshot: any = null) {
      ctxDraw.clearRect(0, 0, ctxDraw.canvas.width, ctxDraw.canvas.height);
      if (imagenFondo) ctxDraw.drawImage(imagenFondo, 0, 0, ctxDraw.canvas.width, ctxDraw.canvas.height);

      // Aristas
      aristas.forEach(({ from, to, peso, direccion }) => {
        if (direccion === "forward") {
          drawArrow(nodos[from].x, nodos[from].y, nodos[to].x, nodos[to].y, "black", ctxDraw);
        } else if (direccion === "both") {
          drawArrow(nodos[from].x, nodos[from].y, nodos[to].x, nodos[to].y, "black", ctxDraw);
          drawArrow(nodos[to].x, nodos[to].y, nodos[from].x, nodos[from].y, "black", ctxDraw);
        }

        const px = (nodos[from].x + nodos[to].x) / 2;
        const py = (nodos[from].y + nodos[to].y) / 2;
        ctxDraw.fillStyle = "white";
        ctxDraw.strokeStyle = "black";
        ctxDraw.fillRect(px - 12, py - 10, 24, 18);
        ctxDraw.strokeRect(px - 12, py - 10, 24, 18);
        ctxDraw.fillStyle = "black";
        ctxDraw.font = "12px Arial";
        ctxDraw.fillText(peso, px - 6, py + 4);
      });

      // Resaltar arista explorada en snapshot
      if (snapshot && snapshot.explorada) {
        const [f, t] = snapshot.explorada;
        drawArrow(nodos[f].x, nodos[f].y, nodos[t].x, nodos[t].y, "red", ctxDraw);
      }

      // Resaltar aristas camino final
      aristasResaltadas.forEach(([f, t]) => {
        drawArrow(nodos[f].x, nodos[f].y, nodos[t].x, nodos[t].y, "red", ctxDraw);
      });

      // Nodos
      nodos.forEach((n, i) => {
        ctxDraw.beginPath();
        ctxDraw.arc(n.x, n.y, radio, 0, Math.PI * 2);
        ctxDraw.fillStyle = nodosResaltados.includes(i) ? "yellow" : "lightblue";
        ctxDraw.fill();
        ctxDraw.stroke();
        ctxDraw.fillStyle = "black";
        ctxDraw.fillText(n.nombre, n.x - 5, n.y + 5);

        // Mostrar [dist, padre] en snapshot
        if (snapshot) {
          const d = snapshot.dist[i];
          const padre = snapshot.padre[i];
          const txt = (d === Infinity) ? "∞" : d;
          ctxDraw.font = "11px Arial";
          ctxDraw.fillStyle = snapshot.visitado[i] ? "black" : "green";
          ctxDraw.fillText(`[${txt}, ${padre !== null ? nodos[padre].nombre : "-"}]`, n.x - 30, n.y - 25);
        }
      });
    }

    // --- Render tabla ---
    function renderTablaIteraciones(log: any[]) {
      const cont = document.getElementById("tablaContainer")!;
      if (!log || log.length === 0) { cont.innerHTML = ""; return; }
      let html = `<table class="table table-bordered table-sm"><thead><tr><th>Iteración</th><th>Permanentes</th><th>Temporales</th></tr></thead><tbody>`;
      for (const fila of log) {
        html += `<tr><td>${fila.iter}</td><td>${fila.permanentes}</td><td>${fila.temporales}</td></tr>`;
      }
      html += `</tbody></table>`;
      cont.innerHTML = html;
    }

    // --- Algoritmo Dijkstra ---
    function calcularDijkstra() {
      if (nodos.length === 0 || aristas.length === 0) {
        alert("Debes tener al menos un par de nodos y una arista.");
        return;
      }

      logIteraciones = [];
      snapshots = [];
      (document.getElementById("tablaContainer") as HTMLElement).innerHTML = "";
      (document.getElementById("canvasesIteraciones") as HTMLElement).innerHTML = "";
      (document.getElementById("btnMostrar") as HTMLButtonElement).disabled = false;

      const origen = +(document.getElementById("origen") as HTMLSelectElement).value;
      const destino = +(document.getElementById("destino") as HTMLSelectElement).value;
      const dist = Array(nodos.length).fill(Infinity);
      const padre = Array(nodos.length).fill(null);
      const visitado = Array(nodos.length).fill(false);
      dist[origen] = 0;

      let iteraciones = 0;

      for (let i = 0; i < nodos.length; i++) {
        iteraciones++;
        let u = -1;
        for (let j = 0; j < nodos.length; j++) {
          if (!visitado[j] && (u === -1 || dist[j] < dist[u])) u = j;
        }
        if (u === -1 || dist[u] === Infinity) break;

        visitado[u] = true;

        for (let a of aristas) {
          let v: number | null = null;
          if (a.direccion === "forward") {
            if (u === a.from) v = a.to;
          } else if (a.direccion === "both") {
            if (u === a.from) v = a.to;
            else if (u === a.to) v = a.from;
          }

          if (v === null || visitado[v]) continue;

          const nuevaDist = dist[u] + a.peso;
          const explorada = [u, v];
          if (nuevaDist < dist[v]) {
            dist[v] = nuevaDist;
            padre[v] = u;
          }
          snapshots.push({ padre: [...padre], dist: [...dist], visitado: [...visitado], explorada: [...explorada] });
        }

        const permanentes: string[] = [], temporales: string[] = [];
        for (let k = 0; k < nodos.length; k++) {
          if (visitado[k]) permanentes.push(nodos[k].nombre);
          else temporales.push(`${nodos[k].nombre}:[${dist[k] === Infinity ? "∞" : dist[k]}, ${padre[k] !== null ? nodos[padre[k]].nombre : "-"}]`);
        }
        logIteraciones.push({ iter: iteraciones, permanentes: permanentes.join(", "), temporales: temporales.join("  ") });
      }

      const resultado = document.getElementById("resultado")!;
      if (dist[destino] < Infinity) {
        const camino: number[] = [];
        for (let v = destino; v !== null; v = padre[v]) camino.unshift(v);
        resultado.innerText =
          "Costo mínimo: " + dist[destino] +
          "\nRecorrer por:\n" + camino.map(i => nodos[i].nombre).join(" → ") +
          "\n\nCantidad de iteraciones: " + logIteraciones.length;

        aristasCaminoFinal = [];
        nodosCaminoFinal = camino;
        for (let i = 1; i < camino.length; i++) {
          aristasCaminoFinal.push([camino[i - 1], camino[i]]);
        }
        dibujarGrafo(aristasCaminoFinal, nodosCaminoFinal);
      } else {
        resultado.innerText = "No hay camino.\n\nIteraciones: " + logIteraciones.length;
        aristasCaminoFinal = [];
        nodosCaminoFinal = [];
        dibujarGrafo();
      }

      renderTablaIteraciones(logIteraciones);
    }

    // --- Mostrar pasos ---
    function mostrarPasos() {
      const cont = document.getElementById("canvasesIteraciones")!;
      cont.innerHTML = "";
      snapshots.forEach((snap, idx) => {
        const block = document.createElement("div");
        block.className = "iteracion-block";
        block.innerHTML = `<h4>Paso ${idx + 1}</h4>`;
        const c = document.createElement("canvas");
        c.width = 1000; c.height = 600;

        const t = document.createElement("table");
        t.className = "table table-bordered table-sm";
        let thead = "<tr><th>Nodo</th><th>Dist</th><th>Padre</th><th>Visitado</th></tr>";
        let rows = "";
        nodos.forEach((n, i) => {
          rows += `<tr><td>${n.nombre}</td><td>${snap.dist[i] === Infinity ? "∞" : snap.dist[i]}</td><td>${snap.padre[i] !== null ? nodos[snap.padre[i]].nombre : "-"}</td><td>${snap.visitado[i] ? "✔" : "✘"}</td></tr>`;
        });
        t.innerHTML = `<thead>${thead}</thead><tbody>${rows}</tbody>`;
        block.appendChild(c);
        block.appendChild(t);
        cont.appendChild(block);
        dibujarGrafo([], [], c.getContext("2d")!, snap);
      });
    }

    // --- Eventos canvas ---
    canvas.addEventListener("click", e => {
      const rect = canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      const i = nodos.findIndex(n => Math.hypot(n.x - x, n.y - y) < radio);

      if (i === -1) {
        const nombre = String.fromCharCode(65 + nodos.length);
        const nuevoNodo = { nombre, x, y };
        nodos.push(nuevoNodo);
        guardarAccion("nodo", nuevoNodo);
        actualizarSelects();
      } else {
        if (seleccion1 === null) {
          seleccion1 = i;
        } else {
          if (seleccion1 !== i) {
            const peso = prompt("Peso de la arista (número no negativo):");
            const p = parseFloat(peso!);
            if (!isNaN(p) && p >= 0) {
              const dir = prompt(
                "Dirección de la arista:\n" +
                "1 = " + nodos[seleccion1].nombre + " → " + nodos[i].nombre +
                "\n2 = " + nodos[i].nombre + " → " + nodos[seleccion1].nombre +
                "\n3 = Bidireccional"
              );
              let nuevaArista = null;
              if (dir === "1") nuevaArista = { from: seleccion1, to: i, peso: p, direccion: "forward" };
              else if (dir === "2") nuevaArista = { from: i, to: seleccion1, peso: p, direccion: "forward" };
              else if (dir === "3") nuevaArista = { from: seleccion1, to: i, peso: p, direccion: "both" };
              if (nuevaArista) {
                aristas.push(nuevaArista);
                guardarAccion("arista", nuevaArista);
              }
            } else {
              alert("Peso inválido. Debe ser un número >= 0.");
            }
          }
          seleccion1 = null;
        }
      }
      dibujarGrafo(aristasCaminoFinal, nodosCaminoFinal);
    });

    // --- Imagen de fondo ---
    document.getElementById("imagenFondo")?.addEventListener("change", function (e: any) {
      const file = e.target.files[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = function (event: any) {
          const img = new Image();
          img.onload = function () {
            imagenFondo = img;
            dibujarGrafo(aristasCaminoFinal, nodosCaminoFinal);
          };
          img.src = event.target.result;
        };
        reader.readAsDataURL(file);
      }
    });

    // --- Undo/Redo ---
    function undo() {
      if (acciones.length === 0) return;
      const a = acciones.pop();
      rehacerAcciones.push(JSON.parse(JSON.stringify(a)));
      if (a.tipo === "nodo") nodos.pop();
      else if (a.tipo === "arista") aristas.pop();
      actualizarSelects();
      dibujarGrafo(aristasCaminoFinal, nodosCaminoFinal);
    }

    function redo() {
      if (rehacerAcciones.length === 0) return;
      const a = rehacerAcciones.pop();
      acciones.push(JSON.parse(JSON.stringify(a)));
      if (a.tipo === "nodo") nodos.push(a.data);
      else if (a.tipo === "arista") aristas.push(a.data);
      actualizarSelects();
      dibujarGrafo(aristasCaminoFinal, nodosCaminoFinal);
    }

    // --- Exponer funciones ---
    (window as any).quitarFondo = () => { imagenFondo = null; dibujarGrafo(aristasCaminoFinal, nodosCaminoFinal); };
    (window as any).calcularDijkstra = calcularDijkstra;
    (window as any).mostrarPasos = mostrarPasos;
    (window as any).undo = undo;
    (window as any).redo = redo;

    // Inicial
    dibujarGrafo();
  }
}
