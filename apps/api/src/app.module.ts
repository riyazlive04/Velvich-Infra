import { Module } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { ThrottlerModule } from '@nestjs/throttler';
import { PrismaModule } from './prisma/prisma.module';
import { PermissionsModule } from './permissions/permissions.module';
import { AuditModule } from './audit/audit.module';
import { StorageModule } from './storage/storage.module';
import { AiModule } from './ai/ai.module';
import { AccountsModule } from './accounts/accounts.module';
import { AuthModule } from './auth/auth.module';
import { HealthModule } from './health/health.module';
import { UsersModule } from './users/users.module';
import { ClientsModule } from './clients/clients.module';
import { StaffModule } from './staff/staff.module';
import { ProjectsModule } from './projects/projects.module';
import { TransactionsModule } from './transactions/transactions.module';
import { ReceivablesModule } from './receivables/receivables.module';
import { ActivitiesModule } from './activities/activities.module';
import { DocumentsModule } from './documents/documents.module';
import { DashboardModule } from './dashboard/dashboard.module';
import { SettingsModule } from './settings/settings.module';
import { ReportsModule } from './reports/reports.module';
import { ImportModule } from './import/import.module';
import { BigIntInterceptor } from './common/bigint.interceptor';

@Module({
  imports: [
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 120 }]),
    // Global infrastructure
    PrismaModule,
    PermissionsModule,
    AuditModule,
    StorageModule,
    AiModule,
    AccountsModule,
    // Auth must load early — it registers the global AuthGuard.
    AuthModule,
    HealthModule,
    // Feature modules
    UsersModule,
    ClientsModule,
    StaffModule,
    ProjectsModule,
    TransactionsModule,
    ReceivablesModule,
    ActivitiesModule,
    DocumentsModule,
    DashboardModule,
    SettingsModule,
    ReportsModule,
    ImportModule,
  ],
  providers: [{ provide: APP_INTERCEPTOR, useClass: BigIntInterceptor }],
})
export class AppModule {}
