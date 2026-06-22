import {
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { loadEnv } from '../config/env';

/**
 * Cloudflare R2 (S3-compatible) wrapper. Buckets are PRIVATE - objects are only
 * reachable via short-lived signed URLs minted after a permission check. Keys
 * are namespaced and randomised so they are unguessable.
 */
@Injectable()
export class StorageService {
  private readonly env = loadEnv();
  private readonly client: S3Client | null;

  constructor() {
    this.client =
      this.env.R2_ENDPOINT && this.env.R2_ACCESS_KEY_ID && this.env.R2_SECRET_ACCESS_KEY
        ? new S3Client({
            region: 'auto',
            endpoint: this.env.R2_ENDPOINT,
            credentials: {
              accessKeyId: this.env.R2_ACCESS_KEY_ID,
              secretAccessKey: this.env.R2_SECRET_ACCESS_KEY,
            },
          })
        : null;
  }

  isConfigured(): boolean {
    return this.client !== null;
  }

  buildKey(prefix: string, fileName: string): string {
    const safe = fileName.replace(/[^\w.\-]+/g, '_').slice(-80);
    return `${prefix}/${randomUUID()}-${safe}`;
  }

  async put(key: string, body: Buffer, contentType: string): Promise<string> {
    this.assert();
    await this.client!.send(
      new PutObjectCommand({
        Bucket: this.env.R2_BUCKET,
        Key: key,
        Body: body,
        ContentType: contentType,
      }),
    );
    return key;
  }

  /** Short-lived signed download URL. Caller MUST have checked permission first. */
  async signedDownloadUrl(key: string): Promise<string> {
    this.assert();
    return getSignedUrl(
      this.client!,
      new GetObjectCommand({ Bucket: this.env.R2_BUCKET, Key: key }),
      { expiresIn: this.env.R2_SIGNED_URL_TTL },
    );
  }

  async delete(key: string): Promise<void> {
    this.assert();
    await this.client!.send(
      new DeleteObjectCommand({ Bucket: this.env.R2_BUCKET, Key: key }),
    );
  }

  private assert(): void {
    if (!this.client) {
      throw new ServiceUnavailableException('File storage (R2) is not configured');
    }
  }
}
