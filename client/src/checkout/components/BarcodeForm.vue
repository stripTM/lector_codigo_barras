<script setup lang="ts">
import { ref } from 'vue';

const emit = defineEmits<{
  submitBarcode: [barcode: string];
}>();

const barcode = ref('');

function submit(): void {
  const trimmedBarcode = barcode.value.trim();
  if (!trimmedBarcode) {
    return;
  }
  emit('submitBarcode', trimmedBarcode);
  barcode.value = '';
}
</script>

<template>
  <form class="barcode-form" @submit.prevent="submit">
    <input
      v-model="barcode"
      class="barcode-form__input"
      type="text"
      placeholder="Código de barras"
      aria-label="Código de barras"
    />
    <button type="submit" class="button button--primary">Añadir</button>
  </form>
</template>
