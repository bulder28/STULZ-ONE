<template>
  <div class="kiosk-container">
    <!-- CABECERA TÁCTIL STULZ -->
    <header class="kiosk-header">
      <div class="header-left">
        <div class="stulz-badge">STULZ</div>
        <div>
          <h1>AREABOARD | Terminal Táctil de Planta</h1>
          <p class="subtitle">Control de Presencia Inmediata (7,75 h) — Planta Coslada</p>
        </div>
      </div>
      <div class="header-right">
        <div class="shift-badge">TURNO 1 (06:00 - 14:00)</div>
        <div class="clock">{{ currentTime }}</div>
      </div>
    </header>

    <!-- CUADRANTE TÁCTIL DE LÍNEAS (L1..L5 + BOX 1) -->
    <main class="kiosk-main">
      <div class="lines-grid">
        <div 
          v-for="linea in lineas" 
          :key="linea.codigo" 
          class="linea-touch-card"
          :class="{ active: selectedLinea === linea.codigo }"
          @click="selectLinea(linea.codigo)"
        >
          <div class="linea-header">
            <span class="linea-code">{{ linea.codigo }}</span>
            <span class="linea-andon" :class="getAndonClass(linea)"></span>
          </div>
          <div class="linea-name">{{ linea.nombre }}</div>
          
          <div class="linea-stats">
            <div class="stat-box">
              <span class="stat-label">Presentes</span>
              <span class="stat-val">{{ getPresentesEnLinea(linea.codigo).length }}</span>
            </div>
            <div class="stat-box">
              <span class="stat-label">Target FTE</span>
              <span class="stat-val">{{ linea.targetFte }}</span>
            </div>
          </div>

          <!-- Operarios en Línea -->
          <div class="operarios-chips">
            <div 
              v-for="op in getPresentesEnLinea(linea.codigo)" 
              :key="op.siglas"
              class="op-chip"
              :class="{ training: op.enFormacion }"
              @click.stop="togglePresencia(op)"
            >
              <span class="op-siglas">{{ op.siglas }}</span>
              <span class="op-hours">7.75h</span>
            </div>
          </div>
        </div>
      </div>

      <!-- PANEL LATERAL TÁCTIL / ESCÁNER VIRTUAL -->
      <aside class="kiosk-aside">
        <div class="scanner-card">
          <h3>Fichaje Rápido por Código / Siglas</h3>
          <p class="scanner-desc">Introduzca siglas ERP o código Zucchetti</p>
          
          <div class="numpad-display">
            {{ keypadInput || '---' }}
          </div>

          <div class="numpad-grid">
            <button v-for="n in ['1','2','3','4','5','6','7','8','9','C','0','OK']" 
                    :key="n" 
                    class="numpad-btn"
                    :class="{ ok: n === 'OK', clear: n === 'C' }"
                    @click="handleNumpad(n)">
              {{ n }}
            </button>
          </div>

          <div class="quick-siglas-bar">
            <button v-for="sig in ['EJAY', 'SDU', 'JMVM', 'DFM', 'ERM', 'MSP']" 
                    :key="sig" 
                    class="sigla-quick-btn"
                    @click="ficharPorSiglas(sig)">
              {{ sig }}
            </button>
          </div>
        </div>

        <!-- RESUMEN EN VIVO -->
        <div class="summary-card">
          <h4>Estado General de Planta</h4>
          <div class="summary-row">
            <span>Líneas Operativas:</span>
            <strong>6 (L1 - L5, BOX 1)</strong>
          </div>
          <div class="summary-row">
            <span>Operarios Presentes:</span>
            <strong>{{ operarios.filter(o => o.presente).length }} / {{ operarios.length }}</strong>
          </div>
          <div class="summary-row">
            <span>Horas Totales Imputadas:</span>
            <strong>{{ (operarios.filter(o => o.presente).length * 7.75).toFixed(2) }} h</strong>
          </div>
          <div class="summary-row">
            <span>Seguridad Red:</span>
            <strong style="color: #008744;">100% AIR-GAP LOCAL</strong>
          </div>
        </div>
      </aside>
    </main>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue';

interface Operario {
  siglas: string;
  nombre: string;
  linea: string;
  presente: boolean;
  enFormacion: boolean;
}

const currentTime = ref('');
const selectedLinea = ref('L1');
const keypadInput = ref('');

const lineas = ref([
  { codigo: 'L1', nombre: 'Climatizadores Gemela 1', targetFte: 14.0 },
  { codigo: 'L2', nombre: 'Climatizadores Gemela 2', targetFte: 14.0 },
  { codigo: 'L3', nombre: 'Climatizadores Gemela 3', targetFte: 14.0 },
  { codigo: 'L4', nombre: 'Climatizadores Gemela 4', targetFte: 14.0 },
  { codigo: 'L5', nombre: 'Climatizadores Gemela 5', targetFte: 14.0 },
  { codigo: 'BOX 1', nombre: 'Especiales / Prototipos', targetFte: 8.0 }
]);

const operarios = ref<Operario[]>([
  { siglas: 'EJAY', nombre: 'Eduardo Jiménez', linea: 'L1', presente: true, enFormacion: false },
  { siglas: 'SDU', nombre: 'Sergio Díaz', linea: 'L1', presente: true, enFormacion: false },
  { siglas: 'JMVM', nombre: 'Juan Manuel Vázquez', linea: 'L1', presente: true, enFormacion: false },
  { siglas: 'DFM', nombre: 'David Fernández', linea: 'L2', presente: true, enFormacion: false },
  { siglas: 'ERM', nombre: 'Enrique Rodríguez', linea: 'L2', presente: true, enFormacion: false },
  { siglas: 'MSP', nombre: 'Manuel Sánchez', linea: 'L3', presente: true, enFormacion: true },
  { siglas: 'LBC', nombre: 'Luis Benítez', linea: 'L3', presente: true, enFormacion: false },
  { siglas: 'DMV', nombre: 'Daniel Martín', linea: 'L4', presente: true, enFormacion: false },
  { siglas: 'RIO', nombre: 'Roberto Iglesias', linea: 'L5', presente: true, enFormacion: false },
  { siglas: 'JPL', nombre: 'Javier Pérez', linea: 'BOX 1', presente: true, enFormacion: false }
]);

function updateTime() {
  const now = new Date();
  currentTime.value = now.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

let timer: any;
let eventSource: EventSource | null = null;

onMounted(() => {
  updateTime();
  timer = setInterval(updateTime, 1000);

  // Conectar con el backend Node.js mediante SSE
  try {
    eventSource = new EventSource('http://127.0.0.1:4000/api/events?role=KIOSCO_VUE');
    eventSource.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.type === 'REASIGNACION_LINEA') {
        const target = operarios.value.find(o => o.siglas === data.payload.siglas);
        if (target) {
          target.linea = data.payload.lineaDestino;
        }
      }
    };
  } catch (e) {
    console.log('SSE Offline en modo Kiosco Local');
  }
});

onUnmounted(() => {
  clearInterval(timer);
  if (eventSource) eventSource.close();
});

function selectLinea(codigo: string) {
  selectedLinea.value = codigo;
}

function getPresentesEnLinea(codigoLinea: string) {
  return operarios.value.filter(o => o.linea === codigoLinea && o.presente);
}

function getAndonClass(linea: any) {
  const count = getPresentesEnLinea(linea.codigo).length;
  if (count >= 10) return 'andon-green';
  if (count >= 5) return 'andon-yellow';
  return 'andon-red';
}

function togglePresencia(op: Operario) {
  op.presente = !op.presente;
}

function handleNumpad(btn: string) {
  if (btn === 'C') {
    keypadInput.value = '';
  } else if (btn === 'OK') {
    if (keypadInput.value) {
      alert(`Fichaje registrado para código: ${keypadInput.value}`);
      keypadInput.value = '';
    }
  } else {
    if (keypadInput.value.length < 8) {
      keypadInput.value += btn;
    }
  }
}

function ficharPorSiglas(sig: string) {
  const op = operarios.value.find(o => o.siglas === sig);
  if (op) {
    op.presente = !op.presente;
    alert(`Presencia de ${sig} actualizada: ${op.presente ? 'PRESENTE (7,75 h)' : 'AUSENTE'}`);
  }
}
</script>

<style scoped>
.kiosk-container {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
  background-color: #eceef1;
}

.kiosk-header {
  height: 70px;
  background: linear-gradient(90deg, #b8000b 0%, #e30613 100%);
  color: #ffffff;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 28px;
  box-shadow: 0 4px 12px rgba(184, 0, 11, 0.25);
}

.header-left {
  display: flex;
  align-items: center;
  gap: 16px;
}

.stulz-badge {
  background: #ffffff;
  color: #e30613;
  font-weight: 900;
  font-size: 1.4rem;
  letter-spacing: 1px;
  padding: 6px 14px;
  border-radius: 4px;
}

h1 {
  font-size: 1.25rem;
  font-weight: 700;
}

.subtitle {
  font-size: 0.85rem;
  opacity: 0.9;
}

.header-right {
  display: flex;
  align-items: center;
  gap: 20px;
}

.shift-badge {
  background: rgba(255, 255, 255, 0.2);
  padding: 6px 16px;
  border-radius: 20px;
  font-weight: 700;
  font-size: 0.85rem;
}

.clock {
  font-size: 1.6rem;
  font-weight: 800;
  letter-spacing: 1px;
}

.kiosk-main {
  display: grid;
  grid-template-columns: 1fr 380px;
  gap: 20px;
  padding: 24px;
  flex: 1;
}

.lines-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 16px;
}

.linea-touch-card {
  background: #ffffff;
  border-radius: 10px;
  padding: 18px;
  border: 2px solid #d8dbe0;
  cursor: pointer;
  transition: all 0.2s ease;
  display: flex;
  flex-direction: column;
}

.linea-touch-card.active {
  border-color: #e30613;
  box-shadow: 0 6px 16px rgba(227, 6, 19, 0.15);
}

.linea-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.linea-code {
  font-size: 1.6rem;
  font-weight: 800;
  color: #b8000b;
}

.linea-andon {
  width: 18px;
  height: 18px;
  border-radius: 50%;
}
.andon-green { background: #008744; box-shadow: 0 0 10px #008744; }
.andon-yellow { background: #d97706; box-shadow: 0 0 10px #d97706; }
.andon-red { background: #e30613; box-shadow: 0 0 10px #e30613; }

.linea-name {
  font-size: 0.95rem;
  color: #575757;
  margin-top: 4px;
}

.linea-stats {
  display: flex;
  gap: 12px;
  margin: 14px 0;
}

.stat-box {
  flex: 1;
  background: #f8fafc;
  padding: 8px;
  border-radius: 6px;
  text-align: center;
  border: 1px solid #e2e8f0;
}

.stat-label {
  display: block;
  font-size: 0.75rem;
  color: #64748b;
  text-transform: uppercase;
}

.stat-val {
  font-size: 1.2rem;
  font-weight: 700;
  color: #1a1a1a;
}

.operarios-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: auto;
}

.op-chip {
  background: #e2e8f0;
  padding: 6px 10px;
  border-radius: 6px;
  font-weight: 700;
  font-size: 0.85rem;
  display: flex;
  align-items: center;
  gap: 6px;
  cursor: pointer;
}

.op-chip.training {
  border: 2px dashed #d97706;
  background: #fef3c7;
}

.op-hours {
  font-size: 0.7rem;
  background: #008744;
  color: #fff;
  padding: 2px 4px;
  border-radius: 3px;
}

.kiosk-aside {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.scanner-card, .summary-card {
  background: #ffffff;
  padding: 20px;
  border-radius: 10px;
  border: 1px solid #d8dbe0;
}

.scanner-card h3, .summary-card h4 {
  font-size: 1.1rem;
  color: #1a1a1a;
  margin-bottom: 6px;
}

.scanner-desc {
  font-size: 0.85rem;
  color: #64748b;
  margin-bottom: 14px;
}

.numpad-display {
  background: #1a1a1a;
  color: #00ff66;
  font-family: monospace;
  font-size: 1.8rem;
  text-align: center;
  padding: 12px;
  border-radius: 6px;
  letter-spacing: 4px;
  margin-bottom: 14px;
}

.numpad-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 10px;
  margin-bottom: 14px;
}

.numpad-btn {
  height: 54px;
  font-size: 1.4rem;
  font-weight: 700;
  border: 1px solid #cbd5e1;
  background: #f8fafc;
  border-radius: 6px;
  cursor: pointer;
}

.numpad-btn:active {
  background: #e2e8f0;
}

.numpad-btn.ok {
  background: #008744;
  color: #ffffff;
  border-color: #008744;
}

.numpad-btn.clear {
  background: #e30613;
  color: #ffffff;
  border-color: #e30613;
}

.quick-siglas-bar {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
}

.sigla-quick-btn {
  padding: 10px;
  font-size: 0.95rem;
  font-weight: 700;
  border: 1px solid #d8dbe0;
  background: #ffffff;
  border-radius: 6px;
  cursor: pointer;
}

.sigla-quick-btn:hover {
  background: #e30613;
  color: #ffffff;
}

.summary-row {
  display: flex;
  justify-content: space-between;
  padding: 10px 0;
  border-bottom: 1px solid #f1f5f9;
  font-size: 0.9rem;
}
</style>
