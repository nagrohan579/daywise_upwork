/**
 * Helper functions for image cropping
 * Uses the EXACT same logic as getCroppedImg from cropImage.js
 */

/**
 * Gets the radian angle from degree value
 */
const getRadianAngle = (degreeValue) => {
  return (degreeValue * Math.PI) / 180;
};

/**
 * Gets the rotated size of an image
 */
const getRotatedSize = (width, height, rotation) => {
  const rotRad = getRadianAngle(rotation);
  return {
    width: Math.abs(Math.cos(rotRad) * width) + Math.abs(Math.sin(rotRad) * height),
    height: Math.abs(Math.sin(rotRad) * width) + Math.abs(Math.cos(rotRad) * height),
  };
};

/**
 * Creates an Image object from a source
 * @param {string} src - Image source URL or data URL
 * @returns {Promise<HTMLImageElement>}
 */
const createImage = (src) => {
  return new Promise((resolve, reject) => {
    const image = new Image();
    
    // For external URLs, try with CORS first
    if (src.startsWith('http://') || src.startsWith('https://')) {
      image.crossOrigin = 'anonymous';
    }
    
    image.onload = () => {
      console.log('createImage - Image loaded successfully', {
        src: src.substring(0, 100),
        width: image.width,
        height: image.height,
        crossOrigin: image.crossOrigin
      });
      resolve(image);
    };
    
    image.onerror = (error) => {
      console.error('createImage - Error loading image with CORS:', error);
      // If CORS fails, try without crossOrigin
      if (image.crossOrigin === 'anonymous' && (src.startsWith('http://') || src.startsWith('https://'))) {
        console.log('createImage - Retrying without CORS');
        const retryImage = new Image();
        retryImage.onload = () => {
          console.log('createImage - Image loaded without CORS');
          resolve(retryImage);
        };
        retryImage.onerror = (retryError) => {
          console.error('createImage - Error loading image without CORS:', retryError);
          reject(retryError);
        };
        retryImage.src = src;
      } else {
        reject(error);
      }
    };
    
    image.src = src;
  });
};

/**
 * Creates a cropped image from the source image
 * EXACT COPY of getCroppedImg from cropImage.js - this is the WORKING version
 * @param {string} imageSrc - Source image URL or data URL
 * @param {Object} pixelCrop - Crop area in pixels { x, y, width, height }
 * @param {number} rotation - Rotation in degrees
 * @returns {Promise<Blob>} Cropped image blob
 */
export const createImageFromCrop = async (imageSrc, pixelCrop, rotation = 0) => {
  console.log('createImageFromCrop - Starting crop', {
    imageSrc: imageSrc.substring(0, 100),
    pixelCrop,
    rotation
  });
  
  const image = await createImage(imageSrc);
  console.log('createImageFromCrop - Image loaded', {
    width: image.width,
    height: image.height
  });
  
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');

  if (!ctx) {
    throw new Error('Canvas context not available');
  }

  const rotRad = getRadianAngle(rotation);

  // Calculate bounding box of the rotated image
  const { width: bBoxWidth, height: bBoxHeight } = getRotatedSize(image.width, image.height, rotation);
  console.log('createImageFromCrop - Rotated size', {
    bBoxWidth,
    bBoxHeight,
    originalWidth: image.width,
    originalHeight: image.height
  });

  // Set canvas size to match bounding box
  canvas.width = bBoxWidth;
  canvas.height = bBoxHeight;

  // Move canvas center
  ctx.translate(bBoxWidth / 2, bBoxHeight / 2);
  ctx.rotate(rotRad);
  ctx.translate(-image.width / 2, -image.height / 2);

  // Draw rotated image
  try {
    ctx.drawImage(image, 0, 0);
    console.log('createImageFromCrop - Image drawn to canvas');
  } catch (error) {
    console.error('createImageFromCrop - Error drawing image to canvas (likely CORS):', error);
    throw new Error('Failed to draw image to canvas. This is likely a CORS issue. The image server needs to allow cross-origin requests.');
  }

  // Validate crop coordinates
  if (pixelCrop.x < 0 || pixelCrop.y < 0 || 
      pixelCrop.x + pixelCrop.width > bBoxWidth || 
      pixelCrop.y + pixelCrop.height > bBoxHeight) {
    console.warn('createImageFromCrop - Crop coordinates out of bounds, clamping', {
      pixelCrop,
      bBoxWidth,
      bBoxHeight
    });
    // Clamp coordinates
    pixelCrop.x = Math.max(0, Math.min(pixelCrop.x, bBoxWidth - pixelCrop.width));
    pixelCrop.y = Math.max(0, Math.min(pixelCrop.y, bBoxHeight - pixelCrop.height));
  }

  // Extract the cropped area from the rotated image
  let data;
  try {
    data = ctx.getImageData(pixelCrop.x, pixelCrop.y, pixelCrop.width, pixelCrop.height);
    console.log('createImageFromCrop - Image data extracted', {
      width: data.width,
      height: data.height
    });
  } catch (error) {
    console.error('createImageFromCrop - Error getting image data (likely CORS):', error);
    throw new Error('Failed to extract image data. This is likely a CORS issue. The image server needs to allow cross-origin requests.');
  }

  // Set canvas width to final desired crop size
  canvas.width = pixelCrop.width;
  canvas.height = pixelCrop.height;

  // Paste cropped image data
  ctx.putImageData(data, 0, 0);
  console.log('createImageFromCrop - Cropped image data pasted');

  // Return as a blob
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) {
          console.log('createImageFromCrop - Blob created successfully', {
            size: blob.size,
            type: blob.type
          });
          resolve(blob);
        } else {
          console.error('createImageFromCrop - Failed to create blob');
          reject(new Error('Failed to create blob'));
        }
      },
      'image/png',
      0.95
    );
  });
};

/**
 * Converts crop data to a blob URL for display
 * Applies crop transformations to an image
 * @param {string} imageSrc - Source image URL
 * @param {Object} cropData - Crop data { x, y, zoom, rotation, croppedAreaPixels }
 * @returns {Promise<string>} Blob URL of the cropped image
 */
export const getCroppedImageUrl = async (imageSrc, cropData) => {
  if (!cropData || !cropData.croppedAreaPixels) {
    console.log('getCroppedImageUrl - No crop data, returning original');
    return imageSrc;
  }

  const pixelCrop = cropData.croppedAreaPixels;
  const rotation = cropData.rotation || 0;

  // Validate pixelCrop structure
  if (!pixelCrop.x && pixelCrop.x !== 0 || !pixelCrop.y && pixelCrop.y !== 0 || !pixelCrop.width || !pixelCrop.height) {
    console.error('getCroppedImageUrl - Invalid pixelCrop structure:', pixelCrop);
    return imageSrc;
  }

  try {
    console.log('getCroppedImageUrl - Applying crop:', {
      src: imageSrc,
      pixelCrop: pixelCrop,
      rotation: rotation
    });

    const blob = await createImageFromCrop(imageSrc, pixelCrop, rotation);
    const blobUrl = URL.createObjectURL(blob);
    console.log('getCroppedImageUrl - Successfully created cropped image blob URL');
    return blobUrl;
  } catch (error) {
    console.error('getCroppedImageUrl - Error creating cropped image:', error);
    throw error;
  }
};
