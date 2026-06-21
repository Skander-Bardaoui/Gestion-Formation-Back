import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Like } from 'typeorm';
import { Employe } from '../../entities/employe.entity';

@Injectable()
export class EmployeService {
  constructor(
    @InjectRepository(Employe)
    private readonly employeRepository: Repository<Employe>,
  ) {}

  async create(dto: {
    nom: string;
    prenom: string;
    email: string;
    telephone?: string;
    poste?: string;
    departement?: string;
    entrepriseText?: string;
    dateEmbauche?: string;
  }): Promise<Employe> {
    const existing = await this.employeRepository.findOne({ where: { email: dto.email } });
    if (existing) throw new ConflictException('Un employé avec cet email existe déjà');

    const employe = this.employeRepository.create({
      ...dto,
      dateEmbauche: dto.dateEmbauche ? new Date(dto.dateEmbauche) : undefined,
      identifiant: await this.generateIdentifiant(),
    });
    return this.employeRepository.save(employe);
  }

  async findAll(): Promise<Employe[]> {
    return this.employeRepository.find({ order: { identifiant: 'DESC' } });
  }

  async findOne(id: string): Promise<Employe> {
    const employe = await this.employeRepository.findOne({ where: { id } });
    if (!employe) throw new NotFoundException(`Employé #${id} introuvable`);
    return employe;
  }

  async update(id: string, dto: Partial<{
    nom: string;
    prenom: string;
    email: string;
    telephone: string;
    poste: string;
    departement: string;
    entrepriseText: string;
    dateEmbauche: string;
  }>): Promise<Employe> {
    const employe = await this.findOne(id);
    if (dto.email && dto.email !== employe.email) {
      const existing = await this.employeRepository.findOne({ where: { email: dto.email } });
      if (existing) throw new ConflictException('Un employé avec cet email existe déjà');
    }
    Object.assign(employe, {
      ...dto,
      dateEmbauche: dto.dateEmbauche ? new Date(dto.dateEmbauche) : employe.dateEmbauche,
    });
    return this.employeRepository.save(employe);
  }

  async remove(id: string): Promise<void> {
    const result = await this.employeRepository.delete(id);
    if (result.affected === 0) throw new NotFoundException(`Employé #${id} introuvable`);
  }

  private async generateIdentifiant(): Promise<string> {
    const year = new Date().getFullYear().toString();
    const [last] = await this.employeRepository.find({
      where: { identifiant: Like(`${year}STG%`) },
      order: { identifiant: 'DESC' },
      take: 1,
    });

    let nextNum = 1;
    if (last?.identifiant) {
      const match = last.identifiant.match(/(\d+)$/);
      if (match) nextNum = parseInt(match[1]) + 1;
    }

    return `${year}STG${nextNum.toString().padStart(3, '0')}`;
  }
}
