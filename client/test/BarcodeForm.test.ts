import { describe, expect, it } from 'vitest';
import { mount } from '@vue/test-utils';
import BarcodeForm from '../src/checkout/components/BarcodeForm.vue';

describe('BarcodeForm', () => {
  it('emits the typed barcode on submit and clears the input', async () => {
    const wrapper = mount(BarcodeForm);
    const input = wrapper.find('input');

    await input.setValue('8480000123456');
    await wrapper.find('form').trigger('submit');

    expect(wrapper.emitted('submitBarcode')).toEqual([['8480000123456']]);
    expect(input.element.value).toBe('');
  });

  it('trims whitespace around the barcode', async () => {
    const wrapper = mount(BarcodeForm);

    await wrapper.find('input').setValue('  111  ');
    await wrapper.find('form').trigger('submit');

    expect(wrapper.emitted('submitBarcode')).toEqual([['111']]);
  });

  it('does not emit when the input is empty', async () => {
    const wrapper = mount(BarcodeForm);

    await wrapper.find('form').trigger('submit');

    expect(wrapper.emitted('submitBarcode')).toBeUndefined();
  });
});
