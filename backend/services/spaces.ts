import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { Upload } from '@aws-sdk/lib-storage';

// Initialize S3 client for Digital Ocean Spaces
const s3Client = new S3Client({
  endpoint: process.env.DO_SPACES_ENDPOINT,
  region: process.env.DO_SPACES_REGION || 'tor1',
  credentials: {
    accessKeyId: process.env.DO_SPACES_ACCESS_KEY || '',
    secretAccessKey: process.env.DO_SPACES_SECRET_KEY || '',
  },
  forcePathStyle: false, // Use virtual-hosted-style URLs
});

const BUCKET_NAME = process.env.DO_SPACES_BUCKET || 'daywisebookingsspace';
const CDN_ENDPOINT = process.env.DO_SPACES_CDN_ENDPOINT || 'https://daywisebookingsspace.tor1.cdn.digitaloceanspaces.com';

export interface UploadFileOptions {
  fileBuffer: Buffer;
  fileName: string;
  folder: 'profile_pictures' | 'business_logos';
  contentType: string;
}

/**
 * Upload a file to Digital Ocean Spaces
 * @param options Upload options including file buffer, name, folder, and content type
 * @returns CDN URL of the uploaded file
 */
export async function uploadFile(options: UploadFileOptions): Promise<string> {
  const { fileBuffer, fileName, folder, contentType } = options;
  const key = `${folder}/${fileName}`;

  try {
    const upload = new Upload({
      client: s3Client,
      params: {
        Bucket: BUCKET_NAME,
        Key: key,
        Body: fileBuffer,
        ACL: 'public-read', // Make file publicly accessible
        ContentType: contentType,
      },
    });

    await upload.done();

    // Return CDN URL
    const cdnUrl = `${CDN_ENDPOINT}/${key}`;
    return cdnUrl;
  } catch (error) {
    console.error('Error uploading file to DO Spaces:', error);
    throw new Error('Failed to upload file to Digital Ocean Spaces');
  }
}

/**
 * Delete a file from Digital Ocean Spaces
 * @param fileUrl The CDN URL of the file to delete
 * @returns True if deletion was successful
 */
export async function deleteFile(fileUrl: string): Promise<boolean> {
  try {
    // Extract the key from the CDN URL
    // Example: https://daywisebookingsspace.tor1.cdn.digitaloceanspaces.com/profile_pictures/file.jpg
    // Key should be: profile_pictures/file.jpg
    const url = new URL(fileUrl);
    const key = url.pathname.substring(1); // Remove leading slash

    if (!key) {
      console.warn('Invalid file URL, no key found:', fileUrl);
      return false;
    }

    const command = new DeleteObjectCommand({
      Bucket: BUCKET_NAME,
      Key: key,
    });

    await s3Client.send(command);
    console.log(`Successfully deleted file: ${key}`);
    return true;
  } catch (error) {
    console.error('Error deleting file from DO Spaces:', error);
    // Don't throw error, just log it - deletion failure shouldn't break upload
    return false;
  }
}

/**
 * Check if a URL is from Digital Ocean Spaces
 * @param url URL to check
 * @returns True if URL is from DO Spaces
 */
export function isSpacesUrl(url: string): boolean {
  if (!url) return false;

  try {
    const urlObj = new URL(url);
    return (
      urlObj.hostname.includes('digitaloceanspaces.com') ||
      urlObj.hostname.includes(BUCKET_NAME)
    );
  } catch {
    return false;
  }
}
