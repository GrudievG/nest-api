import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  HeadObjectCommand,
  PutObjectCommand,
  S3Client,
  S3ClientConfig,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

type PresignArgs = {
  key: string;
  contentType: string;
  sizeBytes: number;
};

@Injectable()
export class S3Service {
  private readonly client: S3Client;
  private readonly region: string;
  private readonly bucket: string;
  private readonly endpoint?: string;
  private readonly forcePathStyle: boolean;
  private readonly cloudfrontBaseUrl?: string;
  private readonly defaultExpiresInSec: number;

  constructor(private readonly configService: ConfigService) {
    this.region = this.configService.getOrThrow<string>('aws.region');
    this.bucket = this.configService.getOrThrow<string>('aws.bucket');
    this.endpoint = this.configService.get<string>('aws.s3Endpoint');
    this.forcePathStyle =
      this.configService.getOrThrow<boolean>('aws.forcePathStyle');
    this.cloudfrontBaseUrl = this.trimTrailingSlash(
      this.configService.get<string>('aws.cloudfrontUrl'),
    );
    this.defaultExpiresInSec = this.configService.getOrThrow<number>(
      'aws.filesPresignExpiresInSec',
    );

    const accessKeyId = this.configService.get<string>('aws.accessKeyId');
    const secretAccessKey = this.configService.get<string>(
      'aws.secretAccessKey',
    );

    const clientConfig: S3ClientConfig = {
      region: this.region,
      forcePathStyle: this.forcePathStyle,
    };

    if (this.endpoint) {
      clientConfig.endpoint = this.endpoint;
    }

    if (accessKeyId && secretAccessKey) {
      clientConfig.credentials = { accessKeyId, secretAccessKey };
    }

    this.client = new S3Client(clientConfig);
  }

  getBucketName(): string {
    return this.bucket;
  }

  async presignPutObject(
    args: PresignArgs,
  ): Promise<{ uploadUrl: string; expiresInSec: number }> {
    const expiresInSec = this.defaultExpiresInSec;

    const command = new PutObjectCommand({
      Bucket: this.bucket,
      Key: args.key,
      ContentType: args.contentType,
      ContentLength: args.sizeBytes,
    });

    const uploadUrl = await getSignedUrl(this.client, command, {
      expiresIn: expiresInSec,
    });

    return { uploadUrl, expiresInSec };
  }

  async objectExists(key: string): Promise<boolean> {
    try {
      await this.client.send(
        new HeadObjectCommand({
          Bucket: this.bucket,
          Key: key,
        }),
      );
      return true;
    } catch (error: unknown) {
      if (typeof error === 'object' && error !== null) {
        const maybeError = error as {
          $metadata?: { httpStatusCode?: number };
          statusCode?: number;
        };

        const code =
          maybeError.$metadata?.httpStatusCode ?? maybeError.statusCode;

        if (code === 404) {
          return false;
        }
      }

      throw error;
    }
  }

  buildPublicUrl(key: string): string {
    if (this.cloudfrontBaseUrl) {
      return `${this.cloudfrontBaseUrl}/${key}`;
    }

    if (this.endpoint) {
      const endpoint = this.trimTrailingSlash(this.endpoint) ?? this.endpoint;

      if (this.forcePathStyle) {
        return `${endpoint}/${this.bucket}/${key}`;
      }

      return `${endpoint}/${key}`;
    }

    return `https://${this.bucket}.s3.${this.region}.amazonaws.com/${key}`;
  }

  private trimTrailingSlash(input?: string): string | undefined {
    if (!input) {
      return input;
    }

    return input.replace(/\/+$/, '');
  }
}
