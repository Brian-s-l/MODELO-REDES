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

    // Para mostrar iteraciones/pasos
    let logIteraciones: any[] = [];
    let snapshots: any[] = [];
    let aristasCaminoFinal: any[] = [];
    let nodosCaminoFinal: any[] = [];

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

    function dibujarGrafo(aristasResaltadas: any[] = [], nodosResaltados: any[] = []) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      if (imagenFondo) {
        ctx.drawImage(imagenFondo, 0, 0, canvas.width, canvas.height);
      }

      aristas.forEach(a => {
        const n1 = nodos[a.from], n2 = nodos[a.to];
        ctx.beginPath();
        ctx.moveTo(n1.x, n1.y);
        ctx.lineTo(n2.x, n2.y);
        ctx.strokeStyle = aristasResaltadas.includes(a) ? "red" : "black";
        ctx.stroke();
        ctx.fillStyle = "black";
        ctx.fillText(a.peso, (n1.x + n2.x) / 2, (n1.y + n2.y) / 2);
      });

      nodos.forEach((n, i) => {
        ctx.beginPath();
        ctx.arc(n.x, n.y, radio, 0, 2 * Math.PI);
        ctx.fillStyle = nodosResaltados.includes(i) ? "yellow" : "lightblue";
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = "black";
        ctx.fillText(n.nombre, n.x - 5, n.y + 5);
      });
    }

    function undo() {
      if (acciones.length === 0) return;
      const ultima = acciones.pop();
      rehacerAcciones.push(ultima);
      if (ultima.tipo === "nodo") nodos.pop();
      if (ultima.tipo === "arista") aristas.pop();
      actualizarSelects();
      dibujarGrafo();
    }

    function redo() {
      if (rehacerAcciones.length === 0) return;
      const accion = rehacerAcciones.pop();
      acciones.push(accion);
      if (accion.tipo === "nodo") nodos.push(accion.data);
      if (accion.tipo === "arista") aristas.push(accion.data);
      actualizarSelects();
      dibujarGrafo();
    }

    function calcularDijkstra() {
      const origen = parseInt((document.getElementById("origen") as HTMLSelectElement).value);
      const destino = parseInt((document.getElementById("destino") as HTMLSelectElement).value);
      const dist: number[] = new Array(nodos.length).fill(Infinity);
      const prev: any[] = new Array(nodos.length).fill(null);
      const visitado: boolean[] = new Array(nodos.length).fill(false);

      dist[origen] = 0;
      logIteraciones = [];
      snapshots = [];

      for (let i = 0; i < nodos.length; i++) {
        let u = -1;
        for (let j = 0; j < nodos.length; j++) {
          if (!visitado[j] && (u === -1 || dist[j] < dist[u])) u = j;
        }
        if (dist[u] === Infinity) break;
        visitado[u] = true;

        aristas.forEach(a => {
          if (a.from === u) {
            const v = a.to;
            if (dist[u] + a.peso < dist[v]) {
              dist[v] = dist[u] + a.peso;
              prev[v] = u;
            }
          }
          if (a.direccion === "both" && a.to === u) {
            const v = a.from;
            if (dist[u] + a.peso < dist[v]) {
              dist[v] = dist[u] + a.peso;
              prev[v] = u;
            }
          }
        });

        logIteraciones.push({ dist: [...dist], prev: [...prev] });
        snapshots.push(canvas.toDataURL());
      }

      let camino: number[] = [];
      for (let at = destino; at != null; at = prev[at]) camino.push(at);
      camino.reverse();

      if (dist[destino] === Infinity) {
        (document.getElementById("resultado") as HTMLElement).innerText = "No hay camino disponible";
        (document.getElementById("btnMostrar") as HTMLButtonElement).disabled = true;
        return;
      }

      (document.getElementById("resultado") as HTMLElement).innerText =
        `Distancia mínima: ${dist[destino]}\nCamino: ${camino.map(i => nodos[i].nombre).join(" → ")}`;
      (document.getElementById("btnMostrar") as HTMLButtonElement).disabled = false;

      aristasCaminoFinal = [];
      nodosCaminoFinal = camino;
      for (let i = 0; i < camino.length - 1; i++) {
        const u = camino[i], v = camino[i + 1];
        const arista = aristas.find(a => (a.from === u && a.to === v) || (a.direccion === "both" && a.to === u && a.from === v));
        if (arista) aristasCaminoFinal.push(arista);
      }
      dibujarGrafo(aristasCaminoFinal, nodosCaminoFinal);
    }

    function mostrarPasos() {
      const cont = document.getElementById("canvasesIteraciones") as HTMLElement;
      cont.innerHTML = "";
      logIteraciones.forEach((log, i) => {
        const div = document.createElement("div");
        div.className = "iteracion-block";
        div.innerHTML = `<h4>Iteración ${i + 1}</h4>`;
        const img = new Image();
        img.src = snapshots[i];
        img.width = 400;
        div.appendChild(img);
        cont.appendChild(div);
      });
    }

    // Eventos
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
              const dir = prompt("Dirección:\n1 = forward\n2 = backward\n3 = both");
              let nuevaArista = null;
              if (dir === "1") nuevaArista = { from: seleccion1, to: i, peso: p, direccion: "forward" };
              if (dir === "2") nuevaArista = { from: i, to: seleccion1, peso: p, direccion: "forward" };
              if (dir === "3") nuevaArista = { from: seleccion1, to: i, peso: p, direccion: "both" };
              if (nuevaArista) {
                aristas.push(nuevaArista);
                guardarAccion("arista", nuevaArista);
              }
            } else alert("Peso inválido.");
          }
          seleccion1 = null;
        }
      }
      dibujarGrafo(aristasCaminoFinal, nodosCaminoFinal);
    });

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

    // Exponer funciones para HTML
    (window as any).quitarFondo = () => { imagenFondo = null; dibujarGrafo(aristasCaminoFinal, nodosCaminoFinal); };
    (window as any).calcularDijkstra = calcularDijkstra;
    (window as any).mostrarPasos = mostrarPasos;
    (window as any).undo = undo;
    (window as any).redo = redo;

    // Inicial
    dibujarGrafo();
  }
}
