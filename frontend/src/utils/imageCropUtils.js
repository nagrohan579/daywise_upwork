/**
 * Creates a cropped image blob from an image source and crop data
 * react-easy-crop handles rotation internally, so we need to apply rotation first,
 * then crop from the rotated image
 * @param {string} imageSrc - Source image URL or data URL
 * @param {Object} croppedAreaPixels - Crop area in pixels { x, y, width, height } (already accounts for rotation)
 * @param {number} rotation - Rotation in degrees (already applied by react-easy-crop)
 * @returns {Promise<Blob>} Cropped image blob
 */
export const createImageFromCrop = async (imageSrc, croppedAreaPixels, rotation = 0) => {
  const image = await createImage(imageSrc);
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');

  if (!ctx) {
    throw new Error('Canvas context not available');
  }

  // react-easy-crop gives us the crop area that already accounts for rotation
  // We need to draw the rotated image first, then crop from it
  const { x, y, width, height } = croppedAreaPixels;
  
  // Create a temporary canvas to rotate the image
  const tempCanvas = document.createElement('canvas');
  const tempCtx = tempCanvas.getContext('2d');
  
  if (!tempCtx) {
    throw new Error('Temp canvas context not available');
  }

  // Calculate dimensions for rotated image
  const radians = (rotation * Math.PI) / 180;
  const cos = Math.abs(Math.cos(radians));
  const sin = Math.abs(Math.sin(radians));
  const rotatedWidth = image.width * cos + image.height * sin;
  const rotatedHeight = image.width * sin + image.height * cos;

  tempCanvas.width = rotatedWidth;
  tempCanvas.height = rotatedHeight;

  // Draw rotated image
  tempCtx.save();
  tempCtx.translate(rotatedWidth / 2, rotatedHeight / 2);
  tempCtx.rotate(radians);
  tempCtx.drawImage(image, -image.width / 2, -image.height / 2);
  tempCtx.restore();

  // Now crop from the rotated image
  canvas.width = width;
  canvas.height = height;

  ctx.drawImage(
    tempCanvas,
    x,
    y,
    width,
    height,
    0,
    0,
    width,
    height
  );

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) {
          resolve(blob);
        } else {
          reject(new Error('Failed to create blob'));
        }
      },
      'image/png',
      0.95
    );
  });
};

/**
 * Creates an Image object from a source
 * @param {string} src - Image source URL or data URL
 * @returns {Promise<HTMLImageElement>}
 */
const createImage = (src) => {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.crossOrigin = 'anonymous';
    image.onload = () => resolve(image);
    image.onerror = reject;
    image.src = src;
  });
};

/**
 * Converts crop data to a data URL for display
 * Applies crop transformations to an image
 * @param {string} imageSrc - Source image URL
 * @param {Object} cropData - Crop data { x, y, zoom, rotation, croppedAreaPixels }
 * @returns {Promise<string>} Data URL of the cropped image
 */
export const getCroppedImageUrl = async (imageSrc, cropData) => {
  if (!cropData || !cropData.croppedAreaPixels) {
    return imageSrc;
  }

  try {
    const blob = await createImageFromCrop(
      imageSrc,
      cropData.croppedAreaPixels,
      cropData.rotation || 0
    );
    return URL.createObjectURL(blob);
  } catch (error) {
    console.error('Error creating cropped image:', error);
    return imageSrc; // Fallback to original
  }
};

