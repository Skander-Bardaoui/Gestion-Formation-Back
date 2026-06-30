import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { join } from 'path';
import * as fs from 'fs';
import PDFDocument from 'pdfkit';
import { Certificate } from '../../entities/certificate.entity';
import { User } from '../../entities/user.entity';
import { Formation } from '../../entities/formation.entity';
import { Session } from '../../entities/session.entity';
import { CreateCertificateDto } from './dto/create-certificate.dto';
import { UpdateCertificateDto } from './dto/update-certificate.dto';
import { CertificateStatus } from '../../common/enums';

@Injectable()
export class CertificateService {
  constructor(
    @InjectRepository(Certificate)
    private readonly certificateRepository: Repository<Certificate>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Formation)
    private readonly formationRepository: Repository<Formation>,
    @InjectRepository(Session)
    private readonly sessionRepository: Repository<Session>,
  ) {}

  async create(dto: CreateCertificateDto): Promise<Certificate> {
    const user = await this.userRepository.findOneBy({ id: dto.employeId });
    if (!user) throw new NotFoundException(`User #${dto.employeId} not found`);

    const formation = await this.formationRepository.findOneBy({ id: dto.formationId });
    if (!formation) throw new NotFoundException(`Formation #${dto.formationId} not found`);

    const session = await this.sessionRepository.findOneBy({ id: dto.sessionId });
    if (!session) throw new NotFoundException(`Session #${dto.sessionId} not found`);

    const certificate = this.certificateRepository.create({
      ...dto,
      dateEmission: new Date(dto.dateEmission),
      dateExpiration: dto.dateExpiration ? new Date(dto.dateExpiration) : undefined,
      user,
      formation,
      session,
    });
    return this.certificateRepository.save(certificate);
  }

  async findAll(): Promise<Certificate[]> {
    return this.certificateRepository.find({ relations: { user: true, formation: true, session: true } });
  }

  async findByUser(userId: string): Promise<Certificate[]> {
    return this.certificateRepository.find({
      where: { user: { id: userId } },
      relations: { formation: true, session: true },
      order: { dateEmission: 'DESC' },
    });
  }

  async findOne(id: string): Promise<Certificate> {
    const certificate = await this.certificateRepository.findOne({
      where: { id },
      relations: { user: true, formation: true, session: true },
    });
    if (!certificate) throw new NotFoundException(`Certificate #${id} not found`);
    return certificate;
  }

  async update(id: string, dto: UpdateCertificateDto): Promise<Certificate> {
    const certificate = await this.findOne(id);
    Object.assign(certificate, dto);
    return this.certificateRepository.save(certificate);
  }

  async regenerate(id: string): Promise<Certificate> {
    const cert = await this.findOne(id);
    if (!cert.user || !cert.formation || !cert.session) {
      throw new BadRequestException('Certificat incomplet (utilisateur, formation ou session manquant)');
    }

    const session = await this.sessionRepository.findOne({
      where: { id: cert.session.id },
      relations: { formateurs: true },
    });

    if (cert.certificatUrl) {
      const oldPath = join(__dirname, '..', '..', '..', cert.certificatUrl);
      if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
    }

    const certsDir = join(__dirname, '..', '..', '..', 'uploads', 'certificates');
    if (!fs.existsSync(certsDir)) fs.mkdirSync(certsDir, { recursive: true });

    const filename = `certificat_${cert.user.id}_${Date.now()}.pdf`;
    const filePath = join(certsDir, filename);

    await this.generateCertificatePdf({
      filePath,
      nom: cert.user.nom,
      prenom: cert.user.prenom,
      formationTitre: cert.formation.titre,
      dateDebut: cert.session.dateDebut,
      dateFin: cert.session.dateFin,
      dureeEnJours: cert.formation.dureeEnJours,
      numeroCertificat: cert.numeroCertificat,
      formateurs: (session?.formateurs || []).map((f) => `${f.prenom} ${f.nom}`),
      lieu: cert.session.lieu,
    });

    cert.certificatUrl = `/uploads/certificates/${filename}`;
    cert.dateEmission = new Date();
    return this.certificateRepository.save(cert);
  }

  async remove(id: string): Promise<void> {
    const result = await this.certificateRepository.delete(id);
    if (result.affected === 0) throw new NotFoundException(`Certificate #${id} not found`);
  }

  async generateForSession(sessionId: string, adminId: string): Promise<Certificate[]> {
    const session = await this.sessionRepository.findOne({
      where: { id: sessionId },
      relations: { formation: true, participants: true, formateurs: true, employes: true },
    });
    if (!session) throw new NotFoundException('Session introuvable');
    if (!session.isCompleted) throw new BadRequestException('La session doit être marquée comme terminée');

    const formation = session.formation;
    let participants = session.participants || [];

    if (session.employes?.length) {
      const allUsers = await this.userRepository.find({ where: { role: 'employe' as any } });
      for (const emp of session.employes) {
        const user = allUsers.find((u) => u.email === emp.email);
        if (user && !participants.some((p) => p.id === user.id)) {
          participants.push(user);
        }
      }
    }

    if (participants.length === 0) throw new BadRequestException('Aucun participant dans cette session');

    const existing = await this.certificateRepository.find({ where: { session: { id: sessionId } } });
    const existingUserIds = new Set(existing.map((c) => c.user?.id));

    const certsDir = join(__dirname, '..', '..', '..', 'uploads', 'certificates');
    if (!fs.existsSync(certsDir)) fs.mkdirSync(certsDir, { recursive: true });

    const certificates: Certificate[] = [];

    for (const participant of participants) {
      if (existingUserIds.has(participant.id)) continue;

      const numero = `CERT-${sessionId.slice(0, 8)}-${participant.id.slice(0, 8)}-${Date.now()}`;
      const filename = `certificat_${participant.id}_${Date.now()}.pdf`;
      const filePath = join(certsDir, filename);

      await this.generateCertificatePdf({
        filePath,
        nom: participant.nom,
        prenom: participant.prenom,
        formationTitre: formation.titre,
        dateDebut: session.dateDebut,
        dateFin: session.dateFin,
        dureeEnJours: formation.dureeEnJours,
        numeroCertificat: numero,
        formateurs: (session.formateurs || []).map((f) => `${f.prenom} ${f.nom}`),
        lieu: session.lieu,
      });

      const cert = this.certificateRepository.create({
        numeroCertificat: numero,
        dateEmission: new Date(),
        statut: CertificateStatus.EMIS,
        certificatUrl: `/uploads/certificates/${filename}`,
        isValidated: true,
        validatedBy: adminId,
        user: { id: participant.id } as any,
        formation: { id: formation.id } as any,
        session: { id: session.id } as any,
      });

      const saved = await this.certificateRepository.save(cert);
      certificates.push(saved);
    }

    return certificates;
  }

  private async generateCertificatePdf(options: {
    filePath: string;
    nom: string;
    prenom: string;
    formationTitre: string;
    dateDebut: Date;
    dateFin: Date;
    dureeEnJours: number;
    numeroCertificat: string;
    formateurs: string[];
    lieu?: string;
  }): Promise<void> {
    const {
      filePath, nom, prenom, formationTitre,
      dateDebut, dateFin, dureeEnJours, numeroCertificat, formateurs, lieu,
    } = options;

    const doc = new PDFDocument({ layout: 'landscape', size: 'A4', margin: 55 });
    const stream = fs.createWriteStream(filePath);
    doc.pipe(stream);

    const PW = doc.page.width;
    const PH = doc.page.height;
    const CX = PW / 2;
    const dd = (d: Date) => d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });

    // ---- BORDERS ----
    doc.lineWidth(2).rect(22, 22, PW - 44, PH - 44).stroke('#1a3a5c');
    doc.lineWidth(0.6).rect(28, 28, PW - 56, PH - 56).stroke('#c5a55a');
    doc.lineWidth(0.3).rect(32, 32, PW - 64, PH - 64).stroke('#c5a55a');

   // Corner decorations
const cd = (x: number, y: number, dx: number, dy: number) => {
  doc.lineWidth(1.5)
    .moveTo(x + 8 * dx, y).lineTo(x, y).lineTo(x, y + 8 * dy).stroke('#c5a55a');
  doc.lineWidth(0.8)
    .moveTo(x + 12 * dx, y).lineTo(x, y).lineTo(x, y + 12 * dy).stroke('#c5a55a');
};

cd(28, 28, 1, 1);             // top-left:     opens right + down
cd(PW - 28, 28, -1, 1);       // top-right:    opens left + down
cd(28, PH - 28, 1, -1);       // bottom-left:  opens right + up
cd(PW - 28, PH - 28, -1, -1); // bottom-right: opens left + up

const hr = (y: number, w = 200) => {
  doc.lineWidth(0.5).moveTo(CX - w / 2, y).lineTo(CX + w / 2, y).stroke('#c5a55a');
};

    // ---- TOP SECTION: header ----
    doc.y = 58;
    doc.fontSize(18).font('Helvetica-Bold').fillColor('#1a3a5c').text('STIRFORMA', { align: 'center' });
    doc.fontSize(10).font('Helvetica').fillColor('#666').text('Centre de formation professionnelle', { align: 'center' });
    hr(doc.y + 6, 280); doc.y = doc.y + 20;

    // ---- MIDDLE-TOP: title ----
    doc.y = doc.y + 18;
    doc.fontSize(22).font('Helvetica-Bold').fillColor('#1a3a5c').text('ATTESTATION DE FORMATION', { align: 'center' });
    doc.y = doc.y + 35;

    // ---- CENTER: proclamation + name ----
    doc.fontSize(11).font('Helvetica').fillColor('#666').text('Délivré à', { align: 'center' });
    doc.y = doc.y + 6;
    doc.fontSize(38).font('Helvetica-Bold').fillColor('#1a3a5c')
      .text(`${prenom.toUpperCase()} ${nom.toUpperCase()}`, { align: 'center' });
    doc.y = doc.y + 14;
    doc.fontSize(11).font('Helvetica-Oblique').fillColor('#666')
      .text('Pour avoir suivi la formation :', { align: 'center' });
    doc.y = doc.y + 10;
    doc.fontSize(20).font('Helvetica-BoldOblique').fillColor('#1a3a5c')
      .text(formationTitre, { align: 'center' });

    // ---- LOWER-MIDDLE: details ----
    doc.y = doc.y + 30;
    doc.fontSize(11).font('Helvetica').fillColor('#444');
    doc.text(`du ${dd(new Date(dateDebut))}  au  ${dd(new Date(dateFin))}`, { align: 'center' });
    doc.y = doc.y + 8;
    doc.text(`Durée : ${dureeEnJours || '—'} jour${dureeEnJours > 1 ? 's' : ''}`, { align: 'center' });
    if (lieu) { doc.y = doc.y + 6; doc.text(`Lieu : ${lieu}`, { align: 'center' }); }
    if (formateurs.length > 0) { doc.y = doc.y + 6; doc.text(`Formateur(s) : ${formateurs.join(' - ')}`, { align: 'center' }); }

    // ---- BOTTOM: separator + signatures ----
    const bottomY = PH - 110;
    hr(bottomY, 300);
    doc.y = bottomY + 18;

    doc.fontSize(9).font('Helvetica').fillColor('#aaa')
      .text(`N° ${numeroCertificat}  |  Émis le ${new Date().toLocaleDateString('fr-FR')}`, { align: 'center' });

    doc.y = doc.y + 22;
    doc.fontSize(9).font('Helvetica').fillColor('#888');
    doc.text('Signature du responsable', CX - 130, doc.y, { width: 160, align: 'center' });
    doc.text('Cachet du centre', CX + 30, doc.y, { width: 160, align: 'center' });
    doc.lineWidth(0.5).moveTo(CX - 150, doc.y + 18).lineTo(CX + 10, doc.y + 18).stroke('#999');
    doc.lineWidth(0.5).moveTo(CX + 10, doc.y + 18).lineTo(CX + 170, doc.y + 18).stroke('#999');

    doc.end();
    return new Promise((r) => stream.on('finish', r));
  }
}
