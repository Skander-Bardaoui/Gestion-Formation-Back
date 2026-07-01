import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
} from 'typeorm';
import { User } from './user.entity';
import { Session } from './session.entity';

export enum DocumentType {
  CONVENTION_FORMATION = 'convention_formation',
  FEUILLE_EMARGEMENT = 'feuille_emargement',
  CONTRAT_FORMATEUR = 'contrat_formateur',
  CERTIFICAT = 'certificat',
}

@Entity('documents_signes')
export class DocumentSigne {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'enum', enum: DocumentType })
  type: DocumentType;

  @Column({ type: 'varchar', length: 500 })
  titre: string;

  @Column({ type: 'varchar', length: 500 })
  fileUrl: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  fileSize: string;

  @Column({ type: 'boolean', default: false })
  isSignedByParticipant: boolean;

  @Column({ type: 'boolean', default: false })
  isSignedByAdmin: boolean;

  @Column({ type: 'boolean', default: false })
  isSignedByFormateur: boolean;

  @Column({ type: 'timestamp', nullable: true })
  signedAtByParticipant: Date;

  @Column({ type: 'timestamp', nullable: true })
  signedAtByAdmin: Date;

  @Column({ type: 'timestamp', nullable: true })
  signedAtByFormateur: Date;

  @Column({ type: 'varchar', length: 255, nullable: true })
  signatureParticipantId: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  signatureAdminId: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  signatureFormateurId: string;

  @Column({ type: 'simple-json', nullable: true })
  metadata: Record<string, any>;

  @ManyToOne(() => Session, { nullable: true })
  session: Session;

  @Column({ nullable: true })
  sessionId: string;

  @ManyToOne(() => User, { nullable: true })
  participant: User;

  @Column({ nullable: true })
  participantId: string;

  @CreateDateColumn()
  createdAt: Date;
}
