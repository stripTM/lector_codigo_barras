<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue';
import type { CartItemDto } from '@checkout/shared';
import { playBeep } from '../shared/beep';
import { cartApi } from '../shared/cartApi';
import { connectToServer, type ServerSocket } from '../shared/serverSocket';
import BarcodeForm from './components/BarcodeForm.vue';
import ShoppingList from './components/ShoppingList.vue';

const items = ref<CartItemDto[]>([]);
const isConnected = ref(false);
const errorMessage = ref('');

let socket: ServerSocket | null = null;
let knownTotalUnits: number | null = null;

function countTotalUnits(cartItems: CartItemDto[]): number {
  return cartItems.reduce((total, item) => total + item.units, 0);
}

function updateCart(cartItems: CartItemDto[]): void {
  items.value = cartItems;

  // Pita solo cuando aumentan las unidades (producto añadido), no en la
  // carga inicial ni al decrementar, eliminar o vaciar la lista.
  const totalUnits = countTotalUnits(cartItems);
  if (knownTotalUnits !== null && totalUnits > knownTotalUnits) {
    playBeep();
  }
  knownTotalUnits = totalUnits;
}

onMounted(async () => {
  socket = connectToServer(
    (message) => {
      if (message.type === 'cart.updated') {
        updateCart(message.payload.items);
      }
    },
    (connected) => {
      isConnected.value = connected;
    },
  );

  await runAction(async () => {
    updateCart((await cartApi.fetchCart()).items);
  });
});

onBeforeUnmount(() => socket?.close());

async function runAction(action: () => Promise<void>): Promise<void> {
  errorMessage.value = '';
  try {
    await action();
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : 'Error inesperado';
  }
}

const addProduct = (barcode: string) => runAction(() => cartApi.addProduct(barcode).then(() => {}));
const incrementUnits = (barcode: string) =>
  runAction(() => cartApi.incrementUnits(barcode).then(() => {}));
const decrementUnits = (barcode: string) =>
  runAction(() => cartApi.decrementUnits(barcode).then(() => {}));
const removeProduct = (barcode: string) => runAction(() => cartApi.removeProduct(barcode));
const startNewCustomer = () => runAction(() => cartApi.startNewCustomer());
</script>

<template>
  <main class="checkout">
    <header class="checkout__header">
      <h1 class="checkout__title">Terminal de cobro</h1>
      <span
        class="checkout__status"
        :class="isConnected ? 'checkout__status--online' : 'checkout__status--offline'"
      >
        {{ isConnected ? '● Conectado' : '● Desconectado' }}
      </span>
      <button type="button" class="button button--primary" @click="startNewCustomer">
        Nuevo cliente
      </button>
    </header>

    <p v-if="errorMessage" class="checkout__error" role="alert">{{ errorMessage }}</p>

    <BarcodeForm @submit-barcode="addProduct" />

    <ShoppingList
      :items="items"
      @increment="incrementUnits"
      @decrement="decrementUnits"
      @remove="removeProduct"
    />
  </main>
</template>
