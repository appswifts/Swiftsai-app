import { Injectable } from '@nestjs/common';
import { PrismaRepository } from '@gitroom/nestjs-libraries/database/prisma/prisma.service';
import { CreatePlanDto } from '@gitroom/nestjs-libraries/dtos/plans/create.plan.dto';
import { UpdatePlanDto } from '@gitroom/nestjs-libraries/dtos/plans/update.plan.dto';

@Injectable()
export class PlanRepository {
  constructor(
    private readonly _plan: PrismaRepository<'plan'>
  ) {}

  getPlans() {
    return this._plan.model.plan.findMany({
      where: { deletedAt: null },
      orderBy: { monthPrice: 'asc' },
    });
  }

  getActivePlans() {
    return this._plan.model.plan.findMany({
      where: { deletedAt: null, isActive: true },
      orderBy: { monthPrice: 'asc' },
    });
  }

  getPlanById(id: string) {
    return this._plan.model.plan.findFirst({
      where: { id, deletedAt: null },
    });
  }

  getPlanByName(name: string) {
    return this._plan.model.plan.findFirst({
      where: { name, deletedAt: null },
    });
  }

  getDefaultPlan() {
    return this._plan.model.plan.findFirst({
      where: { isDefault: true, deletedAt: null, isActive: true },
    });
  }

  async createPlan(data: CreatePlanDto) {
    if (data.isDefault) {
      await this._plan.model.plan.updateMany({
        where: { isDefault: true },
        data: { isDefault: false },
      });
    }
    return this._plan.model.plan.create({ data });
  }

  async updatePlan(id: string, data: UpdatePlanDto) {
    if (data.isDefault) {
      await this._plan.model.plan.updateMany({
        where: { isDefault: true },
        data: { isDefault: false },
      });
    }
    return this._plan.model.plan.update({
      where: { id },
      data,
    });
  }

  async deletePlan(id: string) {
    return this._plan.model.plan.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  async setDefaultPlan(id: string) {
    await this._plan.model.plan.updateMany({
      where: { isDefault: true },
      data: { isDefault: false },
    });
    return this._plan.model.plan.update({
      where: { id },
      data: { isDefault: true },
    });
  }
}
