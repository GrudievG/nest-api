import { AsyncLocalStorage } from 'node:async_hooks';
import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

export type RequestContextStore = {
  queryCount: number;
};

export const requestContext = new AsyncLocalStorage<RequestContextStore>();

@Injectable()
export class RequestContextMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction) {
    const store = { queryCount: 0 };

    requestContext.run(store, () => {
      res.on('finish', () => {
        if (req.originalUrl.startsWith('/graphql')) {
          console.log(
            `[${req.method} ${req.originalUrl}] SQL queries: ${store.queryCount}`,
          );
        }
      });

      next();
    });
  }
}
