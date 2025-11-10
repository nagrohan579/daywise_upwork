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
  folder: 'profile_pictures' | 'business_logos' | 'intake_form_uploads';
  contentType: string;
  subfolder?: string; // Optional subfolder (e.g., 'temp/sessionId' or bookingId)
}

/**
 * Upload a file to Digital Ocean Spaces
 * @param options Upload options including file buffer, name, folder, and content type
 * @returns CDN URL of the uploaded file
 */
export async function uploadFile(options: UploadFileOptions): Promise<string> {
  const { fileBuffer, fileName, folder, contentType, subfolder } = options;
  const key = subfolder ? `${folder}/${subfolder}/${fileName}` : `${folder}/${fileName}`;

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
    console.log('DELETE FILE - Starting deletion for URL:', fileUrl);

    // Extract the key from the CDN URL
    // Example: https://daywisebookingsspace.tor1.cdn.digitaloceanspaces.com/profile_pictures/file.jpg
    // Key should be: profile_pictures/file.jpg
    const url = new URL(fileUrl);
    const key = url.pathname.substring(1); // Remove leading slash

    console.log('DELETE FILE - Extracted key:', key);
    console.log('DELETE FILE - Bucket:', BUCKET_NAME);

    if (!key) {
      console.warn('DELETE FILE - Invalid file URL, no key found:', fileUrl);
      return false;
    }

    const command = new DeleteObjectCommand({
      Bucket: BUCKET_NAME,
      Key: key,
    });

    console.log('DELETE FILE - Sending delete command to Digital Ocean...');
    const response = await s3Client.send(command);
    console.log('DELETE FILE - Digital Ocean response:', response);
    console.log(`DELETE FILE - Successfully deleted file: ${key}`);
    return true;
  } catch (error) {
    console.error('DELETE FILE - Error deleting file from DO Spaces:', error);
    console.error('DELETE FILE - Error details:', JSON.stringify(error, null, 2));
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

/**
 * Move files from temp folder to booking folder
 * @param fileUrls Array of temp file URLs to move
 * @param bookingId Booking ID for the destination folder
 * @returns Array of new CDN URLs
 */
export async function moveIntakeFormFiles(
  fileUrls: string[],
  bookingId: string
): Promise<string[]> {
  const newUrls: string[] = [];

  for (const fileUrl of fileUrls) {
    try {
      // Extract file name from URL
      // Example: .../intake_form_uploads/temp/sessionId/file.pdf -> file.pdf
      const url = new URL(fileUrl);
      const pathParts = url.pathname.split('/');
      const fileName = pathParts[pathParts.length - 1];

      // Download the file from temp location using fetch
      const response = await fetch(fileUrl);
      if (!response.ok) {
        console.error(`Failed to fetch temp file: ${fileUrl}`);
        continue;
      }

      const arrayBuffer = await response.arrayBuffer();
      const fileBuffer = Buffer.from(arrayBuffer);

      // Get content type from response headers
      const contentType = response.headers.get('content-type') || 'application/octet-stream';

      // Upload to new location
      const newUrl = await uploadFile({
        fileBuffer,
        fileName,
        folder: 'intake_form_uploads',
        subfolder: bookingId,
        contentType,
      });

      newUrls.push(newUrl);

      // Delete the temp file
      await deleteFile(fileUrl);
    } catch (error) {
      console.error(`Error moving file ${fileUrl}:`, error);
      // Continue with other files even if one fails
    }
  }

  return newUrls;
}

/**
 * Delete multiple files at once
 * @param fileUrls Array of file URLs to delete
 * @returns Number of successfully deleted files
 */
export async function deleteMultipleFiles(fileUrls: string[]): Promise<number> {
  let successCount = 0;

  for (const fileUrl of fileUrls) {
    try {
      const success = await deleteFile(fileUrl);
      if (success) {
        successCount++;
      }
    } catch (error) {
      console.error(`Error deleting file ${fileUrl}:`, error);
      // Continue with other files even if one fails
    }
  }

  return successCount;
}
