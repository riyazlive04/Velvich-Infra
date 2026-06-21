import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import type { Response } from 'express';

/** Uniform JSON error shape; maps known Prisma errors to sensible HTTP codes. */
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger('Exceptions');

  catch(exception: unknown, host: ArgumentsHost): void {
    const res = host.switchToHttp().getResponse<Response>();

    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      res.status(status).json(this.body(status, exception.getResponse()));
      return;
    }

    if (exception instanceof Prisma.PrismaClientKnownRequestError) {
      if (exception.code === 'P2025') {
        res.status(HttpStatus.NOT_FOUND).json(this.body(HttpStatus.NOT_FOUND, 'Record not found'));
        return;
      }
      if (exception.code === 'P2002') {
        res
          .status(HttpStatus.CONFLICT)
          .json(this.body(HttpStatus.CONFLICT, 'A record with this value already exists'));
        return;
      }
    }

    this.logger.error(exception instanceof Error ? exception.stack : String(exception));
    res
      .status(HttpStatus.INTERNAL_SERVER_ERROR)
      .json(this.body(HttpStatus.INTERNAL_SERVER_ERROR, 'Internal server error'));
  }

  private body(status: number, message: unknown) {
    const payload = typeof message === 'string' ? { message } : (message as Record<string, unknown>);
    return { statusCode: status, ...payload };
  }
}
