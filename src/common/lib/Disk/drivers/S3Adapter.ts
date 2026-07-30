import * as AWS from 'aws-sdk';
import { IStorage } from './iStorage';
import { DiskOption } from '../Option';

/**
 * S3Adapter for s3 bucket storage
 */
export class S3Adapter implements IStorage {
  private _config: DiskOption;
  private s3: AWS.S3;

  constructor(config: DiskOption) {
    this._config = config;

    // Clean up endpoint trailing slash if present
    const endpoint = this._config.connection.awsEndpoint?.replace(/\/+$/, '');

    const awsConfig: AWS.S3.ClientConfiguration = {
      endpoint: endpoint,
      region: this._config.connection.awsDefaultRegion,
      credentials: {
        accessKeyId: this._config.connection.awsAccessKeyId,
        secretAccessKey: this._config.connection.awsSecretAccessKey,
      },
    };

    if (this._config.connection.minio) {
      awsConfig['s3ForcePathStyle'] = true;
    }

    this.s3 = new AWS.S3({
      ...awsConfig,
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
   * Returns object URL
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
   * Check if file exists
   */
  async isExists(key: string): Promise<boolean> {
    try {
      const cleanKey = key.replace(/^\/+/, '');
      const params = { Bucket: this._config.connection.awsBucket, Key: cleanKey };
      await this.s3.headObject(params).promise();
      return true;
    } catch (error) {
      if ((error as AWS.AWSError).code === 'NotFound') {
        return false;
      }
      throw error;
    }
  }

  /**
   * Get data
   */
  async get(key: string) {
    try {
      const cleanKey = key.replace(/^\/+/, '');
      const params = { Bucket: this._config.connection.awsBucket, Key: cleanKey };
      const data = this.s3.getObject(params).createReadStream();
      return data;
    } catch (error) {
      throw new Error(`Failed to get object ${key}: ${error}`);
    }
  }

  /**
   * Put data
   */
  async put(
    key: string,
    value: Buffer | Uint8Array | string,
    contentType?: string | undefined | null
  ): Promise<AWS.S3.ManagedUpload.SendData> {
    try {
      // ⚠️ FIX: Strip leading slash from S3 Key (e.g. '/avatar/pic.png' -> 'avatar/pic.png')
      const cleanKey = key.replace(/^\/+/, '');

      console.log(contentType)
      console.log({
        Bucket: this._config.connection.awsBucket,
        Key: cleanKey,
        Body: value,
        ...(contentType && { ContentType: contentType })
      })

      const params: AWS.S3.PutObjectRequest = {
        Bucket: this._config.connection.awsBucket,
        Key: cleanKey,
        Body: value,
        ...(contentType && { ContentType: contentType })
      };
      const upload = await this.s3.upload(params).promise();
      return upload;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Delete data
   */
  async delete(key: string): Promise<boolean> {
    try {
      const cleanKey = key.replace(/^\/+/, '');
      const params = { Bucket: this._config.connection.awsBucket, Key: cleanKey };
      await this.s3.deleteObject(params).promise();
      return true;
    } catch (error) {
      if ((error as AWS.AWSError).code === 'NotFound') {
        return false;
      }
      throw error;
    }
  }
}