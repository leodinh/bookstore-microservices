import {
  Check,
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Book } from '../../../../books-service/src/books/entities/book.entity';
import { Order } from './order.entity';

@Entity({ name: 'order_items' })
@Index('IDX_order_items_order_id', ['orderId'])
@Index('IDX_order_items_book_id', ['bookId'])
@Check('CHK_order_items_quantity_positive', '"quantity" > 0')
@Check('CHK_order_items_unit_price_positive', '"unit_price" > 0')
@Check('CHK_order_items_line_total_positive', '"line_total" > 0')
@Check(
  'CHK_order_items_line_total_matches_quantity',
  '"line_total" = "unit_price" * "quantity"',
)
export class OrderItem {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'order_id', type: 'uuid' })
  orderId!: string;

  @ManyToOne(() => Order, (order) => order.items, {
    nullable: false,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'order_id' })
  order!: Order;

  @Column({ name: 'book_id', type: 'uuid' })
  bookId!: string;

  @ManyToOne(() => Book, { nullable: false, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'book_id' })
  book!: Book;

  @Column({ name: 'book_title', type: 'varchar', length: 255 })
  bookTitle!: string;

  @Column({ name: 'unit_price', type: 'numeric', precision: 12, scale: 2 })
  unitPrice!: string;

  @Column({ type: 'integer' })
  quantity!: number;

  @Column({ name: 'line_total', type: 'numeric', precision: 14, scale: 2 })
  lineTotal!: string;
}
