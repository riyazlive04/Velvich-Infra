import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { map, Observable } from 'rxjs';
import { serializeBigInts } from './serialize';

/** Converts BigInt paise to numbers in every JSON response. */
@Injectable()
export class BigIntInterceptor implements NestInterceptor {
  intercept(_context: ExecutionContext, next: CallHandler): Observable<unknown> {
    return next.handle().pipe(map((data) => serializeBigInts(data)));
  }
}
