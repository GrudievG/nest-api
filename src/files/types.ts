import { ALLOWED_CONTENT_TYPES } from './files.service';

export type FileKind = 'avatar' | 'product-image';
export type AllowedContentType = (typeof ALLOWED_CONTENT_TYPES)[number];
