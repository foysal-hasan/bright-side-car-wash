import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  HeadObjectCommand,
} from '@aws-sdk/client-s3';

import { IStorage } from './iStorage';
import { DiskOption } from '../Option';
import { Readable } from 'stream';

export class S3Adapter implements IStorage {
  private _config: DiskOption;
  private s3: S3Client;

  constructor(config: DiskOption) {
    this._config = config;

    this.s3 = new S3Client({
      region: this._config.connection.awsDefaultRegion,
      endpoint: this._config.connection.awsEndpoint || undefined,
      credentials: {
        accessKeyId: this._config.connection.awsAccessKeyId,
        secretAccessKey: this._config.connection.awsSecretAccessKey,
      },
      forcePathStyle: this._config.connection.minio ?? false, // Required for MinIO
    });
  }

  /**
   * Safe path formatter to prevent double slashes (//)
   */
  private formatPath(...parts: string[]): string {
    return parts
      .map((part) => part ? part.replace(/^\/+|\/+$/g, '') : '')
      .filter(Boolean)
      .join('/');
  }

  /**
   * Generate file URL
   */
  url(key: string): string {
    const bucket = this._config.connection.awsBucket;

    if (this._config.connection.minio) {
      const endpoint = this._config.connection.awsEndpoint?.replace(/\/+$/, '');
      const cleanPath = this.formatPath(bucket, key);
      return `${endpoint}/${cleanPath}`;
    }

    const region = this._config.connection.awsDefaultRegion;
    const cleanKey = key.replace(/^\/+/, '');
    return `https://${bucket}.s3.${region}.amazonaws.com/${cleanKey}`;
  }

  /**
   * Check if object exists
   */
  async isExists(key: string): Promise<boolean> {
    try {
      const cleanKey = key.replace(/^\/+/, '');
      await this.s3.send(
        new HeadObjectCommand({
          Bucket: this._config.connection.awsBucket,
          Key: cleanKey,
        }),
      );
      return true;
    } catch (error: any) {
      if (error.name === 'NotFound') {
        return false;
      }
      throw error;
    }
  }

  /**
   * Get file stream
   */
  async get(key: string): Promise<Readable> {
    try {
      const cleanKey = key.replace(/^\/+/, '');
      const response = await this.s3.send(
        new GetObjectCommand({
          Bucket: this._config.connection.awsBucket,
          Key: cleanKey,
        }),
      );

      return response.Body as Readable;
    } catch (error) {
      throw new Error(`Failed to get object ${key}: ${error}`);
    }
  }

  /**
   * get data stream
   * @param key
   */
  async getStream(key: string): Promise<Readable> {
    try {
      const cleanKey = key.replace(/^\/+/, '');
      const response = await this.s3.send(
        new GetObjectCommand({
          Bucket: this._config.connection.awsBucket,
          Key: cleanKey,
        }),
      );

      return response.Body as Readable;
    } catch (error) {
      throw new Error(`Failed to get S3 stream for object ${key}: ${error}`);
    }
  }
  
  /**
   * Upload file
   */
  async put(
    key: string,
    value: Buffer | Uint8Array | string,
    contentType?: string,
    isPublic: boolean = true,
  ): Promise<string> {
    try {
      const cleanKey = key.replace(/^\/+/, '');
      await this.s3.send(
        new PutObjectCommand({
          Bucket: this._config.connection.awsBucket,
          Key: cleanKey,
          Body: value,
          ContentType: contentType,
          // ACL: isPublic ? 'public-read' : undefined,
        }),
      );

      return this.url(key);
    } catch (error) {
      throw error;
    }
  }

  /**
   * Delete object
   */
  async delete(key: string): Promise<boolean> {
    try {
      const cleanKey = key.replace(/^\/+/, '');
      await this.s3.send(
        new DeleteObjectCommand({
          Bucket: this._config.connection.awsBucket,
          Key: cleanKey,
        }),
      );
      return true;
    } catch (error: any) {
      if (error.name === 'NotFound') {
        return false;
      }
      throw error;
    }
  }
}