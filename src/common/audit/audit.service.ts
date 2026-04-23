import { Injectable, Logger } from '@nestjs/common';
import { AuditEvent, AuditEventInput } from './audit.types';

@Injectable()
export class AuditService {
  private readonly logger = new Logger('AUDIT');

  emit(input: AuditEventInput): void {
    const event: AuditEvent = {
      ...input,
      timestamp: new Date().toISOString(),
    };

    this.logger.log(JSON.stringify(event));
  }
}
