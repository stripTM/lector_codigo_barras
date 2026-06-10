import { describe, expect, it } from 'vitest';
import { mount } from '@vue/test-utils';
import ShoppingList from '../src/checkout/components/ShoppingList.vue';

const items = [
  { barcode: '111', name: 'Galletas', units: 2 },
  { barcode: '222', name: 'Leche', units: 1 },
];

describe('ShoppingList', () => {
  it('shows a message when the list is empty', () => {
    const wrapper = mount(ShoppingList, { props: { items: [] } });

    expect(wrapper.text()).toContain('La lista está vacía');
  });

  it('renders one row per product with name, barcode and units', () => {
    const wrapper = mount(ShoppingList, { props: { items } });

    const firstRow = wrapper.find('tr[data-barcode="111"]');
    expect(firstRow.text()).toContain('Galletas');
    expect(firstRow.text()).toContain('111');
    expect(firstRow.text()).toContain('2');
    expect(wrapper.findAll('tbody tr')).toHaveLength(2);
  });

  it('emits increment with the barcode when clicking +', async () => {
    const wrapper = mount(ShoppingList, { props: { items } });

    await wrapper.find('[aria-label="Añadir una unidad de Galletas"]').trigger('click');

    expect(wrapper.emitted('increment')).toEqual([['111']]);
  });

  it('emits decrement with the barcode when clicking −', async () => {
    const wrapper = mount(ShoppingList, { props: { items } });

    await wrapper.find('[aria-label="Quitar una unidad de Leche"]').trigger('click');

    expect(wrapper.emitted('decrement')).toEqual([['222']]);
  });

  it('emits remove with the barcode when clicking Eliminar', async () => {
    const wrapper = mount(ShoppingList, { props: { items } });

    await wrapper.find('[aria-label="Eliminar Galletas"]').trigger('click');

    expect(wrapper.emitted('remove')).toEqual([['111']]);
  });
});
