import {
  CallHandler,
  ExecutionContext,
  HttpException,
  Injectable,
  Logger,
  NestInterceptor,
} from '@nestjs/common';
import { Observable, tap } from 'rxjs';
import { RequestWithId } from '../middleware/request-id.middleware';
import { Response } from 'express';

@Injectable()
export class HttpLoggerInterceptor implements NestInterceptor {
  private readonly logger = new Logger(HttpLoggerInterceptor.name);

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const http = context.switchToHttp();
    const request = http.getRequest<RequestWithId>();
    const response = http.getResponse<Response>();
    const startedAt = Date.now();

    return next.handle().pipe(
      tap({
        next: () => {
          const ms = Date.now() - startedAt;
          this.logger.log(
            `${request.method} ${request.url} -> ${response.statusCode} (${ms}ms) requestId=${request.requestId}`,
          );
        },
        error: (err) => {
          const ms = Date.now() - startedAt;
          const status = err instanceof HttpException ? err.getStatus() : 500;
          this.logger.error(
            `${request.method} ${request.url} -> ${status} (${ms}ms) requestId=${request.requestId}`,
          );
        },
      }),
    );
  }
}
