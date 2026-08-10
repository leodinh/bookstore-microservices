export interface CreatedOrderItemResponse {
  bookId: string;
  bookTitle: string;
  unitPrice: string;
  quantity: number;
  lineTotal: string;
}

export interface CreateOrderResponse {
  id: string;
  userId: string;
  status: string;
  totalAmount: string;
  items: CreatedOrderItemResponse[];
  createdAt: string;
}
