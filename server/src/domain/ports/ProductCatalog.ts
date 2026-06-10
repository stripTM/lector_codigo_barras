/**
 * Puerto de consulta de información de productos.
 * Devuelve el nombre del producto o null si el código de barras no se encuentra.
 */
export interface ProductCatalog {
  findNameByBarcode(barcode: string): Promise<string | null>;
}
