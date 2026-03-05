import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
} from '@nestjs/common';
import { GqlContextType, GqlArgumentsHost } from '@nestjs/graphql';
import { Request, Response } from 'express';
import { RequestWithId } from '../middleware/request-id.middleware';

interface GraphQLContext {
  req: RequestWithId & { res: Response };
}

@Catch(HttpException)
export class AllExceptionsFilter implements ExceptionFilter {
  catch(exception: HttpException, host: ArgumentsHost) {
    const contextType = host.getType<GqlContextType>();
    const status = exception.getStatus();
    const errorResponse = exception.getResponse();
    const timestamp = new Date().toISOString();

    let response: Response;
    let requestId: string;

    if (contextType === 'graphql') {
      const gqlCtx = GqlArgumentsHost.create(host);
      const ctx = gqlCtx.getContext<GraphQLContext>();
      response = ctx.req.res;
      requestId = ctx.req?.requestId ?? 'unknown';
    } else {
      const ctx = host.switchToHttp();
      response = ctx.getResponse<Response>();
      const request = ctx.getRequest<Request & Partial<RequestWithId>>();
      requestId = request.requestId ?? 'unknown';

      response.status(status).json({
        statusCode: status,
        requestId,
        timestamp,
        path: request.url,
        error: errorResponse,
      });
    }
  }
}
