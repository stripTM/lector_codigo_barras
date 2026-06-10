<script setup lang="ts">
import type { CartItemDto } from '@checkout/shared';

defineProps<{
  items: CartItemDto[];
}>();

defineEmits<{
  increment: [barcode: string];
  decrement: [barcode: string];
  remove: [barcode: string];
}>();
</script>

<template>
  <table class="shopping-list">
    <thead>
      <tr>
        <th>Producto</th>
        <th>Código</th>
        <th class="shopping-list__units">Unidades</th>
        <th></th>
      </tr>
    </thead>
    <tbody>
      <tr v-if="items.length === 0">
        <td colspan="4" class="shopping-list__empty">La lista está vacía</td>
      </tr>
      <tr v-for="item in items" :key="item.barcode" :data-barcode="item.barcode">
        <td>{{ item.name }}</td>
        <td>{{ item.barcode }}</td>
        <td class="shopping-list__units">{{ item.units }}</td>
        <td>
          <div class="shopping-list__actions">
            <button
              type="button"
              class="button"
              :aria-label="`Añadir una unidad de ${item.name}`"
              @click="$emit('increment', item.barcode)"
            >
              +
            </button>
            <button
              type="button"
              class="button"
              :aria-label="`Quitar una unidad de ${item.name}`"
              @click="$emit('decrement', item.barcode)"
            >
              −
            </button>
            <button
              type="button"
              class="button button--danger"
              :aria-label="`Eliminar ${item.name}`"
              @click="$emit('remove', item.barcode)"
            >
              Eliminar
            </button>
          </div>
        </td>
      </tr>
    </tbody>
  </table>
</template>
