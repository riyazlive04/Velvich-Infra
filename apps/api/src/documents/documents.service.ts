import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { StorageService } from '../storage/storage.service';
import { AuditService } from '../audit/audit.service';
import type { AuthUser } from '../auth/auth-user';

@Injectable()
export class DocumentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
    private readonly audit: AuditService,
  ) {}

  list(projectId: string) {
    return this.prisma.document.findMany({
      where: { projectId },
      orderBy: [{ fileName: 'asc' }, { version: 'desc' }],
    });
  }

  async upload(
    actor: AuthUser,
    file: Express.Multer.File,
    meta: { projectId: string; category?: string },
  ) {
    // Version bump: if a file with the same name exists for the project, +1.
    const latest = await this.prisma.document.findFirst({
      where: { projectId: meta.projectId, fileName: file.originalname },
      orderBy: { version: 'desc' },
    });
    const version = (latest?.version ?? 0) + 1;

    const fileKey = this.storage.buildKey(`documents/${meta.projectId}`, file.originalname);
    await this.storage.put(fileKey, file.buffer, file.mimetype);

    const doc = await this.prisma.document.create({
      data: {
        projectId: meta.projectId,
        fileKey,
        fileName: file.originalname,
        mimeType: file.mimetype,
        category: meta.category ?? null,
        version,
        uploadedBy: actor.id,
      },
    });
    await this.audit.log({
      actorId: actor.id,
      action: 'CREATE',
      entity: 'Document',
      entityId: doc.id,
      after: { fileName: doc.fileName, version },
    });
    return doc;
  }

  /**
   * Mint a short-lived signed download URL. Reached only after PermissionsGuard
   * has confirmed `documents:view`, so a bare object key is never publicly usable.
   */
  async getDownloadUrl(actor: AuthUser, id: string) {
    const doc = await this.prisma.document.findUnique({ where: { id } });
    if (!doc) throw new NotFoundException('Document not found');
    const url = await this.storage.signedDownloadUrl(doc.fileKey);
    await this.audit.log({
      actorId: actor.id,
      action: 'DOWNLOAD',
      entity: 'Document',
      entityId: id,
    });
    return { url, fileName: doc.fileName, mimeType: doc.mimeType };
  }

  async remove(actor: AuthUser, id: string) {
    const doc = await this.prisma.document.findUnique({ where: { id } });
    if (!doc) throw new NotFoundException('Document not found');
    await this.storage.delete(doc.fileKey).catch(() => undefined); // tolerate missing object
    await this.prisma.document.delete({ where: { id } });
    await this.audit.log({
      actorId: actor.id,
      action: 'DELETE',
      entity: 'Document',
      entityId: id,
      before: { fileName: doc.fileName },
    });
    return { ok: true };
  }
}
