<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue';
import { BrowserMultiFormatReader, type IScannerControls } from '@zxing/browser';
import { playBeep } from '../shared/beep';
import { connectToServer, type ServerSocket } from '../shared/serverSocket';

/** Tiempo mínimo entre dos envíos del mismo código, para no duplicar productos. */
const SAME_BARCODE_COOLDOWN_MS = 2500;

const scannerId = `movil-${Math.random().toString(36).slice(2, 8)}`;

const videoElement = ref<HTMLVideoElement | null>(null);
const isConnected = ref(false);
const statusMessage = ref('Apunta la cámara a un código de barras');
const statusKind = ref<'info' | 'success' | 'error'>('info');
const cameraError = ref('');

let socket: ServerSocket | null = null;
let scannerControls: IScannerControls | null = null;
let lastBarcode = '';
let lastBarcodeSentAt = 0;

onMounted(async () => {
  socket = connectToServer(
    (message) => {
      if (message.type === 'scanner.scan.accepted') {
        showStatus(`Añadido: ${message.payload.productName}`, 'success');
        playBeep();
        navigator.vibrate?.(100);
      } else if (message.type === 'scanner.scan.rejected') {
        showStatus(`Rechazado: ${message.payload.reason}`, 'error');
      }
    },
    (connected) => {
      isConnected.value = connected;
    },
  );

  await startCamera();
});

onBeforeUnmount(() => {
  scannerControls?.stop();
  socket?.close();
});

async function startCamera(): Promise<void> {
  if (!videoElement.value) {
    return;
  }
  try {
    const codeReader = new BrowserMultiFormatReader();
    scannerControls = await codeReader.decodeFromVideoDevice(
      undefined,
      videoElement.value,
      (result) => {
        if (result) {
          handleDetectedBarcode(result.getText());
        }
      },
    );
  } catch (error) {
    cameraError.value =
      'No se pudo abrir la cámara. Comprueba los permisos y que la página se sirve por HTTPS o localhost.';
    console.error('Camera error', error);
  }
}

function handleDetectedBarcode(barcode: string): void {
  const now = Date.now();
  const isRepeatedScan =
    barcode === lastBarcode && now - lastBarcodeSentAt < SAME_BARCODE_COOLDOWN_MS;
  if (isRepeatedScan) {
    return;
  }

  lastBarcode = barcode;
  lastBarcodeSentAt = now;
  showStatus(`Enviando ${barcode}…`, 'info');
  socket?.send({ type: 'scanner.scan', payload: { id: scannerId, barcode } });
}

function showStatus(message: string, kind: 'info' | 'success' | 'error'): void {
  statusMessage.value = message;
  statusKind.value = kind;
}
</script>

<template>
  <main class="scanner">
    <h1 class="scanner__title">
      Escáner de productos
      <span>{{ isConnected ? '🟢' : '🔴' }}</span>
    </h1>

    <p v-if="cameraError" class="scanner__status scanner__status--error">{{ cameraError }}</p>
    <video v-show="!cameraError" ref="videoElement" class="scanner__video" muted playsinline></video>

    <p
      class="scanner__status"
      :class="{
        'scanner__status--success': statusKind === 'success',
        'scanner__status--error': statusKind === 'error',
      }"
      role="status"
    >
      {{ statusMessage }}
    </p>

    <p class="scanner__id">Lector: {{ scannerId }}</p>
  </main>
</template>
