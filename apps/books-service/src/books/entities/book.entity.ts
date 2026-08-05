import {
  Check,
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity({ name: 'books' })
@Index('UQ_books_isbn', ['isbn'], { unique: true })
@Check('CHK_books_price_positive', '"price" > 0')
@Check('CHK_books_available_quantity_nonnegative', '"available_quantity" >= 0')
@Check('CHK_books_sold_quantity_nonnegative', '"sold_quantity" >= 0')
export class Book {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 255 })
  title!: string;

  @Column({ type: 'varchar', length: 200 })
  author!: string;

  @Column({ type: 'varchar', length: 20 })
  isbn!: string;

  @Column({ type: 'text', nullable: true })
  description!: string | null;

  @Column({ type: 'numeric', precision: 12, scale: 2 })
  price!: string;

  @Column({ name: 'available_quantity', type: 'integer', default: 0 })
  availableQuantity!: number;

  @Column({ name: 'sold_quantity', type: 'integer', default: 0 })
  soldQuantity!: number;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive!: boolean;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}
