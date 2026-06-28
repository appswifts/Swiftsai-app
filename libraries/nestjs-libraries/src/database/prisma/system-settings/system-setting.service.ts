import { Injectable, OnApplicationBootstrap } from '@nestjs/common';
import { SystemSettingRepository } from '@gitroom/nestjs-libraries/database/prisma/system-settings/system-setting.repository';

const MISSING_SENTINEL = '__SYSTEM_SETTING_NOT_FOUND__';
const CACHE_TTL_MS = 3_600_000; // 1 hour

@Injectable()
export class SystemSettingService implements OnApplicationBootstrap {
  private readonly cache = new Map<string, { value: any; expiresAt: number }>();

  constructor(
    private readonly _repository: SystemSettingRepository,
  ) {}

  async onApplicationBootstrap() {
    await this.seedDefaults();
  }

  async get<T = string>(key: string, defaultValue?: T): Promise<T | undefined> {
    const cached = this.getFromCache<T>(key);
    if (cached !== undefined) {
      return cached === (MISSING_SENTINEL as any) ? defaultValue : cached;
    }

    try {
      const record = await this._repository.findByKey(key);
      if (!record) {
        this.setCache(key, MISSING_SENTINEL as any);
        return defaultValue;
      }

      const value = this.castValue(record.value, record.type) as T;
      this.setCache(key, value);
      return value;
    } catch {
      return defaultValue;
    }
  }

  async set(key: string, value: any, type?: string, group?: string): Promise<void> {
    const detectedType = type || this.detectType(value);
    const storedValue = this.encodeValue(value, detectedType);
    const resolvedGroup = group || 'general';

    const record = await this._repository.upsert(key, storedValue, detectedType, resolvedGroup);
    const castValue = this.castValue(record.value, record.type);
    this.setCache(key, castValue);
    this.invalidateGroupCache(resolvedGroup);
  }

  async setMany(settings: Record<string, any>, group: string): Promise<void> {
    const existingTypes = new Map<string, string>();
    try {
      const records = await Promise.all(
        Object.keys(settings).map((k) => this._repository.findByKey(k))
      );
      for (const r of records) {
        if (r) existingTypes.set(r.key, r.type);
      }
    } catch {}

    for (const [key, value] of Object.entries(settings)) {
      const type = existingTypes.get(key) || this.detectType(value);
      const storedValue = this.encodeValue(value, type);
      const record = await this._repository.upsert(key, storedValue, type, group);
      this.setCache(key, this.castValue(record.value, record.type));
    }

    this.invalidateGroupCache(group);
  }

  async getGroup<T = Record<string, any>>(group: string): Promise<T> {
    const cacheKey = `__group:${group}`;
    const cached = this.getFromCache<Record<string, any>>(cacheKey);
    if (cached !== undefined) return cached as T;

    try {
      const records = await this._repository.findByGroup(group);
      const result: Record<string, any> = {};
      for (const r of records) {
        result[r.key] = this.castValue(r.value, r.type);
      }
      this.setCache(cacheKey, result);
      return result as T;
    } catch {
      return {} as T;
    }
  }

  async remove(key: string): Promise<void> {
    try {
      const record = await this._repository.findByKey(key);
      await this._repository.deleteByKey(key);
      this.cache.delete(key);
      if (record) this.invalidateGroupCache(record.group);
    } catch {}
  }

  async clearCache(): Promise<void> {
    this.cache.clear();
  }

  private getFromCache<T>(key: string): T | undefined {
    const entry = this.cache.get(key);
    if (!entry) return undefined;
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return undefined;
    }
    return entry.value as T;
  }

  private setCache(key: string, value: any): void {
    this.cache.set(key, { value, expiresAt: Date.now() + CACHE_TTL_MS });
  }

  private invalidateGroupCache(group: string): void {
    this.cache.delete(`__group:${group}`);
  }

  private castValue(value: string, type: string): any {
    if (value === null || value === undefined) return null;
    switch (type) {
      case 'integer':
        return parseInt(value, 10) || 0;
      case 'boolean':
        return value === '1' || value === 'true' || value === 'yes';
      case 'json':
        try { return JSON.parse(value); } catch { return value; }
      case 'encrypted_json':
        try { return JSON.parse(value); } catch { return value; }
      default:
        return value;
    }
  }

  private encodeValue(value: any, type: string): string {
    switch (type) {
      case 'boolean':
        return value ? '1' : '0';
      case 'integer':
        return String(value);
      case 'json':
        return typeof value === 'string' ? value : JSON.stringify(value);
      case 'encrypted_json':
        return typeof value === 'string' ? value : JSON.stringify(value);
      default:
        return String(value);
    }
  }

  private detectType(value: any): string {
    if (typeof value === 'boolean') return 'boolean';
    if (typeof value === 'number') return 'integer';
    if (Array.isArray(value) || (typeof value === 'object' && value !== null)) return 'json';
    return 'string';
  }

  private async seedDefaults() {
    const defaults: { key: string; value: string; type: string; group: string }[] = [
      { key: 'allow_new_signups', value: '1', type: 'boolean', group: 'general' },
      { key: 'trial_days', value: '14', type: 'integer', group: 'general' },
      { key: 'trial_tier', value: 'STANDARD', type: 'string', group: 'general' },
      { key: 'max_channels_free', value: '3', type: 'integer', group: 'general' },
      { key: 'enable_registration', value: '1', type: 'boolean', group: 'general' },
      { key: 'smtp_host', value: '', type: 'string', group: 'email' },
      { key: 'smtp_port', value: '587', type: 'integer', group: 'email' },
      { key: 'smtp_username', value: '', type: 'string', group: 'email' },
      { key: 'smtp_password', value: '', type: 'string', group: 'email' },
      { key: 'smtp_encryption', value: 'tls', type: 'string', group: 'email' },
      { key: 'mail_from_address', value: '', type: 'string', group: 'email' },
      { key: 'mail_from_name', value: '', type: 'string', group: 'email' },
      { key: 'domain_base_domain', value: '', type: 'string', group: 'domain' },
      { key: 'domain_enable_subdomains', value: '0', type: 'boolean', group: 'domain' },
      { key: 'domain_enable_custom_domains', value: '0', type: 'boolean', group: 'domain' },
    ];

    for (const setting of defaults) {
      const existing = await this._repository.findByKey(setting.key);
      if (!existing) {
        await this._repository.upsert(setting.key, setting.value, setting.type, setting.group);
      }
    }
  }
}
