import { Injectable } from '@nestjs/common';
import { PrismaRepository } from '@gitroom/nestjs-libraries/database/prisma/prisma.service';

@Injectable()
export class SystemSettingRepository {
  constructor(
    private readonly _systemSetting: PrismaRepository<'systemSetting'>
  ) {}

  findByKey(key: string) {
    return this._systemSetting.model.systemSetting.findUnique({
      where: { key },
    });
  }

  findByGroup(group: string) {
    return this._systemSetting.model.systemSetting.findMany({
      where: { group },
    });
  }

  upsert(key: string, value: string, type: string, group: string) {
    return this._systemSetting.model.systemSetting.upsert({
      where: { key },
      create: { key, value, type, group },
      update: { value, type, group },
    });
  }

  deleteByKey(key: string) {
    return this._systemSetting.model.systemSetting.delete({
      where: { key },
    }).catch(() => null);
  }

  getAllKeys() {
    return this._systemSetting.model.systemSetting.findMany({
      select: { key: true },
    });
  }

  getAllGroups() {
    return this._systemSetting.model.systemSetting.findMany({
      select: { group: true },
      distinct: ['group'],
    });
  }
}
