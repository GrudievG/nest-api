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
import { GqlExecutionContext } from '@nestjs/graphql';

interface GraphQLContext {
  req: RequestWithId;
}

interface LogContext {
  request: RequestWithId;
  response: Response;
}

@Injectable()
export class HttpLoggerInterceptor implements NestInterceptor {
  private readonly logger = new Logger(HttpLoggerInterceptor.name);

  private extractLogContext(context: ExecutionContext): LogContext | null {
    try {
      const gqlCtx = GqlExecutionContext.create(context);
      const ctx = gqlCtx.getContext<GraphQLContext>();
      if (ctx.req && ctx.req.res) {
        return { request: ctx.req, response: ctx.req.res };
      }
    } catch {
      // Not a GraphQL request, try HTTP
    }

    const httpContext = context.switchToHttp();
    const request = httpContext.getRequest<RequestWithId>();
    const response = httpContext.getResponse<Response>();

    return { request, response };
  }

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const logContext = this.extractLogContext(context);
    if (!logContext) {
      return next.handle();
    }

    const { request, response } = logContext;
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
