import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Formation } from '../../entities/formation.entity';
import { User } from '../../entities/user.entity';
import { UserRole, NotificationType } from '../../common/enums';
import { NotificationService } from '../notification/notification.service';
import { CreateFormationDto } from './dto/create-formation.dto';
import { UpdateFormationDto } from './dto/update-formation.dto';

@Injectable()
export class FormationService {
  constructor(
    @InjectRepository(Formation)
    private readonly formationRepository: Repository<Formation>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly notificationService: NotificationService,
  ) {}

  async create(dto: CreateFormationDto): Promise<Formation> {
    const formation = this.formationRepository.create(dto);
    const saved = await this.formationRepository.save(formation);

    const all = await this.userRepository.find({ where: [{ role: UserRole.PARTICIPANT }, { role: UserRole.FORMATEUR }] });
    for (const u of all) {
      await this.notificationService.create({
        type: NotificationType.NOUVELLE_FORMATION,
        titre: `Nouvelle formation : ${saved.titre}`,
        message: `La formation "${saved.titre}" a été ajoutée au catalogue.`,
        userId: u.id,
        lienAction: '/catalogue',
      });
    }

    return saved;
  }

  async findAll(): Promise<Formation[]> {
    return this.formationRepository.find({ relations: { sessions: true } });
  }

  async findOne(id: string): Promise<Formation> {
    const formation = await this.formationRepository.findOne({
      where: { id },
      relations: { sessions: true, certificats: true },
    });
    if (!formation) throw new NotFoundException(`Formation #${id} not found`);
    return formation;
  }

  async update(id: string, dto: UpdateFormationDto): Promise<Formation> {
    const formation = await this.findOne(id);
    Object.assign(formation, dto);
    return this.formationRepository.save(formation);
  }

  async remove(id: string): Promise<void> {
    const result = await this.formationRepository.delete(id);
    if (result.affected === 0) throw new NotFoundException(`Formation #${id} not found`);
  }

  async updateImage(id: string, imageUrl: string): Promise<Formation> {
    const formation = await this.findOne(id);
    formation.imageUrl = imageUrl;
    return this.formationRepository.save(formation);
  }

  async addSupport(id: string, support: { nom: string; url: string; type: string }): Promise<Formation> {
    const formation = await this.findOne(id);
    formation.supportsFormation = [...(formation.supportsFormation || []), support];
    return this.formationRepository.save(formation);
  }

  async removeSupport(id: string, index: number): Promise<Formation> {
    const formation = await this.findOne(id);
    const supports = formation.supportsFormation || [];
    if (index < 0 || index >= supports.length) throw new NotFoundException('Support not found');
    supports.splice(index, 1);
    formation.supportsFormation = supports;
    return this.formationRepository.save(formation);
  }
}
