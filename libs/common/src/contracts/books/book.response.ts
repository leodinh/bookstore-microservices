export interface BookResponse {
  id: string;
  title: string;
  author: string;
  isbn: string;
  description: string | null;
  price: string;
  availableQuantity: number;
  soldQuantity: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}
