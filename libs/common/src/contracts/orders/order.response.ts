export interface OrderItemResponse {
  bookId: string;
  bookTitle: string;
  unitPrice: string;
  quantity: number;
  lineTotal: string;
}

export interface OrderResponse {
  id: string;
  userId: string;
  status: string;
  totalAmount: string;
  items: OrderItemResponse[];
  createdAt: string;
}
