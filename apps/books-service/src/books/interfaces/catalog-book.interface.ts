export interface CatalogBook {
  id: string;
  title: string;
  author: string;
  isbn: string;
  description: string | null;
  price: string;
  availableQuantity: number;
  available: boolean;
}
