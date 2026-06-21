import { Controller, Get, Query, Res, UseGuards } from '@nestjs/common';
import type { Response } from 'express';
import ExcelJS from 'exceljs';
import { formatINR, paiseToRupees } from '@velvich/shared';
import { PermissionsGuard } from '../permissions/permissions.guard';
import { RequirePermission } from '../permissions/require-permission.decorator';
import { TransactionsService } from '../transactions/transactions.service';
import { AccountsService } from '../accounts/accounts.service';

/**
 * Excel exports via ExcelJS. PDF exports are scaffolded (TODO: server-side
 * renderer) — see exportPdf below.
 */
@Controller('reports')
@UseGuards(PermissionsGuard)
export class ReportsController {
  constructor(
    private readonly transactions: TransactionsService,
    private readonly accounts: AccountsService,
  ) {}

  @Get('transactions.xlsx')
  @RequirePermission('reports:export')
  async transactionsExcel(
    @Res() res: Response,
    @Query('type') type?: 'INCOME' | 'EXPENSE',
    @Query('month') month?: string,
  ) {
    const { transactions } = await this.transactions.list({ type, month });
    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet('Transactions');
    ws.columns = [
      { header: 'Date', key: 'date', width: 14 },
      { header: 'Type', key: 'type', width: 10 },
      { header: 'Category', key: 'category', width: 22 },
      { header: 'Description', key: 'description', width: 30 },
      { header: 'Project', key: 'project', width: 24 },
      { header: 'Amount (₹)', key: 'amount', width: 16 },
      { header: 'Status', key: 'status', width: 12 },
    ];
    for (const t of transactions) {
      ws.addRow({
        date: new Date(t.date).toLocaleDateString('en-IN'),
        type: t.type,
        category: t.category,
        description: t.description ?? '',
        project: t.project?.name ?? '',
        amount: paiseToRupees(t.amount),
        status: t.incomeStatus ?? t.paidVia ?? '',
      });
    }
    ws.getRow(1).font = { bold: true };
    await this.send(res, wb, 'transactions.xlsx');
  }

  @Get('ledger.xlsx')
  @RequirePermission('reports:export')
  async ledgerExcel(@Res() res: Response, @Query('month') month?: string) {
    const ledger = await this.accounts.ledger(month);
    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet(`Ledger ${ledger.month}`);
    ws.addRow(['Opening balance', formatINR(ledger.opening)]);
    ws.addRow(['Credits', formatINR(ledger.credits)]);
    ws.addRow(['Debits', formatINR(ledger.debits)]);
    ws.addRow(['Closing balance', formatINR(ledger.closing)]);
    ws.addRow([]);
    ws.addRow(['Date', 'Type', 'Category', 'Amount (₹)', 'Balance (₹)']).font = { bold: true };
    for (const e of ledger.statement) {
      ws.addRow([
        new Date(e.date).toLocaleDateString('en-IN'),
        e.type,
        e.category,
        paiseToRupees(e.amount),
        paiseToRupees(e.balance),
      ]);
    }
    await this.send(res, wb, `ledger-${ledger.month}.xlsx`);
  }

  private async send(res: Response, wb: ExcelJS.Workbook, filename: string) {
    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    await wb.xlsx.write(res);
    res.end();
  }
}
