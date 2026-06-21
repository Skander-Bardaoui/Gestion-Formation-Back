import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Certificate } from '../../entities/certificate.entity';
import { User } from '../../entities/user.entity';
import { Formation } from '../../entities/formation.entity';
import { Session } from '../../entities/session.entity';
import { CreateCertificateDto } from './dto/create-certificate.dto';
import { UpdateCertificateDto } from './dto/update-certificate.dto';

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

  async remove(id: string): Promise<void> {
    const result = await this.certificateRepository.delete(id);
    if (result.affected === 0) throw new NotFoundException(`Certificate #${id} not found`);
  }
}
