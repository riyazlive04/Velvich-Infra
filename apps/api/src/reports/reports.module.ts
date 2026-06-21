import { Module } from '@nestjs/common';
import { ReportsController } from './reports.controller';
import { TransactionsService } from '../transactions/transactions.service';

@Module({
  controllers: [ReportsController],
  // TransactionsService is provided here; AccountsService comes from the global AccountsModule.
  providers: [TransactionsService],
})
export class ReportsModule {}
