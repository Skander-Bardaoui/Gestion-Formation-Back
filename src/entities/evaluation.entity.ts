import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
} from 'typeorm';
import { User } from './user.entity';
import { Session } from './session.entity';

@Entity('evaluations')
export class Evaluation {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'decimal', precision: 3, scale: 2 })
  note: number;

  @Column({ type: 'text', nullable: true })
  commentaire: string;

  @Column({ type: 'decimal', precision: 3, scale: 2, nullable: true })
  noteContenu: number;

  @Column({ type: 'decimal', precision: 3, scale: 2, nullable: true })
  notePedagogie: number;

  @Column({ type: 'decimal', precision: 3, scale: 2, nullable: true })
  noteSupports: number;

  @Column({ type: 'decimal', precision: 3, scale: 2, nullable: true })
  noteOrganisation: number;

  @Column({ type: 'boolean', default: false })
  recommande: boolean;

  @Column({ type: 'date' })
  dateEvaluation: Date;

  @Column({ type: 'boolean', default: false })
  isValidated: boolean;

  // Relations
  @ManyToOne(() => User, (user) => user.evaluationsRecues, { nullable: false })
  formateur: User;

  @ManyToOne(() => Session, (session) => session.evaluations, { nullable: false })
  session: Session;

  @ManyToOne(() => User, (user) => user.evaluationsDonnees, { nullable: false })
  participant: User;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
