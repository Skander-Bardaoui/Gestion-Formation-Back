import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import PDFDocument from 'pdfkit';
import { Session } from '../../entities/session.entity';
import { Formation } from '../../entities/formation.entity';
import { User } from '../../entities/user.entity';
import { Employe } from '../../entities/employe.entity';
import { UserRole, NotificationType } from '../../common/enums';
import { NotificationService } from '../notification/notification.service';
import { CreateSessionDto } from './dto/create-session.dto';
import { UpdateSessionDto } from './dto/update-session.dto';

@Injectable()
export class SessionService {
  constructor(
    @InjectRepository(Session)
    private readonly sessionRepository: Repository<Session>,
    @InjectRepository(Formation)
    private readonly formationRepository: Repository<Formation>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Employe)
    private readonly employeRepository: Repository<Employe>,
    private readonly notificationService: NotificationService,
  ) {}

  async create(dto: CreateSessionDto): Promise<Session> {
    const formation = await this.formationRepository.findOneBy({ id: dto.formationId });
    if (!formation) throw new NotFoundException(`Formation #${dto.formationId} not found`);

    const session = this.sessionRepository.create({
      ...dto,
      dateDebut: new Date(dto.dateDebut),
      dateFin: new Date(dto.dateFin),
      formation,
      participants: [],
      employes: [],
      formateurs: [],
    });

    if (dto.participantIds?.length) {
      session.participants = await this.userRepository.find({ where: { id: In(dto.participantIds), role: UserRole.PARTICIPANT } });
    }
    if (dto.employeIds?.length) {
      session.employes = await this.employeRepository.find({ where: { id: In(dto.employeIds) } });
    }
    if (dto.formateurIds?.length) {
      session.formateurs = await this.userRepository.find({ where: { id: In(dto.formateurIds), role: UserRole.FORMATEUR } });
    }

    const saved = await this.sessionRepository.save(session);

    const label = `"${formation.titre}" du ${new Date(dto.dateDebut).toLocaleDateString('fr-FR')} au ${new Date(dto.dateFin).toLocaleDateString('fr-FR')}`;

    const allUsers = await this.userRepository.find({
      where: [{ role: UserRole.PARTICIPANT }, { role: UserRole.FORMATEUR }, { role: UserRole.ADMIN }],
    });

    for (const u of allUsers) {
      const isParticipant = u.role === UserRole.PARTICIPANT;
      const isFormateur = u.role === UserRole.FORMATEUR;
      const isAdmin = u.role === UserRole.ADMIN;

      await this.notificationService.create({
        type: NotificationType.SESSION_PROCHAINE,
        titre: isFormateur
          ? `Session à animer : ${formation.titre}`
          : `Nouvelle session : ${formation.titre}`,
        message: isParticipant
          ? `Une nouvelle session ${label} est disponible. Inscrivez-vous dès maintenant !`
          : isFormateur
            ? `Une nouvelle session ${label} a été créée.`
            : `Une nouvelle session ${label} a été créée.`,
        userId: u.id,
        lienAction: isParticipant ? '/catalogue' : isFormateur ? '/formateur/dashboard' : '/admin/sessions',
      });
    }

    return saved;
  }

  async findAll(): Promise<Session[]> {
    return this.sessionRepository.find({
      relations: { formation: true, participants: true, employes: true, formateurs: true },
    });
  }

  async findOne(id: string): Promise<Session> {
    const session = await this.sessionRepository.findOne({
      where: { id },
      relations: { formation: true, participants: true, employes: true, formateurs: true, presences: true, evaluations: true },
    });
    if (!session) throw new NotFoundException(`Session #${id} not found`);
    return session;
  }

  async update(id: string, dto: UpdateSessionDto): Promise<Session> {
    const session = await this.findOne(id);

    if (dto.formationId) {
      session.formation = await this.formationRepository.findOneBy({ id: dto.formationId });
    }
    if (dto.participantIds) {
      session.participants = await this.userRepository.find({ where: { id: In(dto.participantIds) } });
    }
    if (dto.employeIds) {
      session.employes = await this.employeRepository.find({ where: { id: In(dto.employeIds) } });
    }
    if (dto.formateurIds) {
      session.formateurs = await this.userRepository.find({ where: { id: In(dto.formateurIds) } });
    }

    Object.assign(session, dto);
    return this.sessionRepository.save(session);
  }

  async enroll(sessionId: string, userId: string): Promise<Session> {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user || user.role !== UserRole.PARTICIPANT) {
      throw new BadRequestException('Seuls les participants peuvent s\'inscrire');
    }

    const session = await this.sessionRepository.findOne({
      where: { id: sessionId },
      relations: { participants: true, formation: true },
    });
    if (!session) throw new NotFoundException(`Session #${sessionId} not found`);

    const alreadyEnrolled = session.participants.some((p) => p.id === user.id);
    if (alreadyEnrolled) throw new ConflictException('Vous êtes déjà inscrit à cette session');

    if (session.formation.capaciteMax && session.participants.length >= session.formation.capaciteMax) {
      throw new BadRequestException('La session a atteint sa capacité maximale');
    }

    session.participants.push(user);
    session.nombreParticipants = session.participants.length;
    const saved = await this.sessionRepository.save(session);

    const label = `"${session.formation?.titre}" du ${new Date(session.dateDebut).toLocaleDateString('fr-FR')}`;

    await this.notificationService.create({
      type: NotificationType.RAPPEL_SESSION,
      titre: 'Inscription confirmée',
      message: `Vous êtes inscrit à la session ${label}.`,
      userId: user.id,
      lienAction: '/mes-formations',
    });

    for (const formateur of session.formateurs || []) {
      await this.notificationService.create({
        type: NotificationType.RAPPEL_SESSION,
        titre: 'Nouvel inscrit',
        message: `${user.prenom} ${user.nom} s'est inscrit à la session ${label}.`,
        userId: formateur.id,
      });
    }

    return saved;
  }

  async findMySessions(userId: string, role: string): Promise<Session[]> {
    if (role === UserRole.FORMATEUR) {
      return this.sessionRepository.find({
        where: { formateurs: { id: userId } },
        relations: { formation: true, participants: true },
      });
    }

    return this.sessionRepository.find({
      where: { participants: { id: userId } },
      relations: { formation: true, formateurs: true },
    });
  }

  async generatePresenceList(id: string): Promise<{ buffer: Buffer; titre: string }> {
    const session = await this.sessionRepository.findOne({
      where: { id },
      relations: { formation: true, participants: true, employes: true, formateurs: true },
    });
    if (!session) throw new NotFoundException(`Session #${id} not found`);

    const doc = new PDFDocument({ margin: 40, size: 'A4' });
    const buffers: Buffer[] = [];
    doc.on('data', (chunk) => buffers.push(chunk));
    doc.on('end', () => {});

    const formatDate = (d: Date) =>
      d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
    const formatTime = (d: Date) =>
      d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });

    const titre = session.formation?.titre || 'Formation';
    const dateStr = `${formatDate(new Date(session.dateDebut))} — ${formatDate(new Date(session.dateFin))}`;
    const heureStr = `${formatTime(new Date(session.dateDebut))} — ${formatTime(new Date(session.dateFin))}`;

    doc.fontSize(18).font('Helvetica-Bold').text('Feuille de présence', { align: 'center' });
    doc.moveDown(0.5);
    doc.fontSize(12).font('Helvetica').text(titre, { align: 'center' });
    doc.moveDown(0.3);
    doc.fontSize(10).fillColor('#666').text(`${dateStr} | ${heureStr}`, { align: 'center' });
    if (session.lieu) doc.text(`Lieu : ${session.lieu}`, { align: 'center' });
    doc.fillColor('#000');
    doc.moveDown(1);

    const formateurs = session.formateurs || [];
    if (formateurs.length > 0) {
      doc.fontSize(10).font('Helvetica-Bold').text(`Formateur(s) : ${formateurs.map((f) => `${f.prenom} ${f.nom}`).join(', ')}`);
      doc.moveDown(0.5);
    }

    const allParticipants: { nom: string; prenom: string; identifiant?: string }[] = [
      ...(session.participants || []).map((p) => ({ nom: p.nom, prenom: p.prenom })),
      ...(session.employes || []).map((e) => ({ nom: e.nom, prenom: e.prenom, identifiant: e.identifiant })),
    ];

    if (allParticipants.length === 0) {
      doc.fontSize(11).fillColor('#999').text('Aucun participant inscrit.');
      doc.fillColor('#000');
    } else {
      const tableTop = doc.y;
      const colX = [40, 120, 200, 300, 380];
      const colW = [70, 70, 90, 70, 100];
      const headers = ['N°', 'Nom', 'Prénom', 'Identifiant', 'Signature'];

      doc.fontSize(9).font('Helvetica-Bold');
      headers.forEach((h, i) => doc.text(h, colX[i], tableTop, { width: colW[i], align: 'left' }));

      doc.moveDown(0.3);
      let rowY = doc.y;

      doc.fontSize(9).font('Helvetica');
      allParticipants.forEach((p, idx) => {
        const cells = [String(idx + 1), p.nom, p.prenom, p.identifiant || '—', ''];
        const lineY = rowY;

        cells.forEach((c, i) => {
          doc.text(c, colX[i], lineY, { width: colW[i], align: 'left' });
        });

        doc.moveTo(40, lineY + 14).lineTo(540, lineY + 14).strokeColor('#ddd').stroke();
        doc.strokeColor('#000');
        rowY += 20;

        if (rowY > 750) {
          doc.addPage();
          rowY = 40;
        }
      });

      doc.y = rowY + 10;
    }

    doc.moveDown(1);
    doc.fontSize(9).fillColor('#666').text(
      `Généré le ${new Date().toLocaleDateString('fr-FR')} à ${new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}`,
      { align: 'right' },
    );

    doc.end();
    return new Promise((resolve) => {
      doc.on('end', () => resolve({ buffer: Buffer.concat(buffers), titre }));
    });
  }

  async remove(id: string): Promise<void> {
    const result = await this.sessionRepository.delete(id);
    if (result.affected === 0) throw new NotFoundException(`Session #${id} not found`);
  }
}
