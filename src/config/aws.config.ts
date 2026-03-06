import { registerAs } from '@nestjs/config';

const awsConfig = registerAs('aws', () => ({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  region: process.env.AWS_REGION ?? 'eu-central-1',
  bucket: process.env.AWS_S3_BUCKET,
  s3Endpoint: process.env.AWS_S3_ENDPOINT,
  forcePathStyle:
    (process.env.AWS_S3_FORCE_PATH_STYLE ?? '').toLowerCase() === 'true',
  cloudfrontUrl: (process.env.AWS_CLOUDFRONT_URL ?? '').replace(/\/+$/, ''),
  filesPresignExpiresInSec: Number(
    process.env.FILES_PRESIGN_EXPIRES_IN_SEC ?? 900,
  ),
}));

export default awsConfig;
