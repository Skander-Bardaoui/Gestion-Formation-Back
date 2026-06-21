import { Injectable, OnApplicationBootstrap } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { User } from '../entities/user.entity';
import { UserRole } from '../common/enums';

@Injectable()
export class SeedService implements OnApplicationBootstrap {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  async onApplicationBootstrap() {
    const admin = {
      username: 'admin',
      email: 'admin@test.fr',
      password: '123456',
      role: UserRole.ADMIN,
      isActive: true,
      nom: 'Admin',
      prenom: 'Super',
    } as User;

    let adminUser = await this.userRepository.findOneBy({ email: admin.email });
    if (!adminUser) {
      const hashedPassword = await bcrypt.hash(admin.password, 10);
      adminUser = await this.userRepository.save(
        this.userRepository.create({ ...admin, password: hashedPassword }),
      );
      console.log(`✓ Admin seedé : ${admin.email}`);
    }

    if (!adminUser.isActive) {
      await this.userRepository.update(adminUser.id, { isActive: true });
      console.log(`✓ Admin activé : ${admin.email}`);
    } else {
      console.log(`✓ Admin déjà actif : ${admin.email} (isActive=${adminUser.isActive})`);
    }
  }
}
