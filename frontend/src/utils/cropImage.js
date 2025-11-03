/**
 * Helper functions for image cropping
 * Based on: https://dev.to/mizanrifat/creating-an-image-upload-modal-with-crop-and-rotate-functionality-in-react-5cbd
 */

/**
 * Reads a file and returns it as a data URL
 * @param {File} file - The file to read
 * @returns {Promise<string>} Data URL of the file
 */
export const readFile = (file) => {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.addEventListener('load', () => resolve(reader.result));
    reader.readAsDataURL(file);
  });
};

/**
 * Creates a rotated image on a canvas
 * @param {HTMLImageElement} image - The image element
 * @param {number} rotation - Rotation in degrees
 * @returns {HTMLCanvasElement} Canvas with rotated image
 */
const createImage = (imageSrc) => {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.crossOrigin = 'anonymous';
    image.onload = () => resolve(image);
    image.onerror = reject;
    image.src = imageSrc;
  });
};

/**
 * Gets the rotated size of an image
 * @param {number} width - Original width
 * @param {number} height - Original height
 * @param {number} rotation - Rotation in degrees
 * @returns {{width: number, height: number}} Rotated dimensions
 */
const getRadianAngle = (degreeValue) => {
  return (degreeValue * Math.PI) / 180;
};

const getRotatedSize = (width, height, rotation) => {
  const rotRad = getRadianAngle(rotation);
  return {
    width: Math.abs(Math.cos(rotRad) * width) + Math.abs(Math.sin(rotRad) * height),
    height: Math.abs(Math.sin(rotRad) * width) + Math.abs(Math.cos(rotRad) * height),
  };
};

/**
 * Creates a cropped image from the source image
 * @param {string} imageSrc - Source image URL or data URL
 * @param {Object} pixelCrop - Crop area in pixels { x, y, width, height }
 * @param {number} rotation - Rotation in degrees
 * @param {string} flip - Flip mode: 'horizontal', 'vertical', or 'both'
 * @returns {Promise<Blob>} Cropped image blob
 */
export const getCroppedImg = async (imageSrc, pixelCrop, rotation = 0, flip = { horizontal: false, vertical: false }) => {
  const image = await createImage(imageSrc);
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');

  if (!ctx) {
    throw new Error('Canvas context not available');
  }

  const rotRad = getRadianAngle(rotation);

  // Calculate bounding box of the rotated image
  const { width: bBoxWidth, height: bBoxHeight } = getRotatedSize(image.width, image.height, rotation);

  // Set canvas size to match bounding box
  canvas.width = bBoxWidth;
  canvas.height = bBoxHeight;

  // Move canvas center
  ctx.translate(bBoxWidth / 2, bBoxHeight / 2);
  ctx.rotate(rotRad);
  ctx.scale(flip.horizontal ? -1 : 1, flip.vertical ? -1 : 1);
  ctx.translate(-image.width / 2, -image.height / 2);

  // Draw rotated/flipped image
  ctx.drawImage(image, 0, 0);

  const data = ctx.getImageData(pixelCrop.x, pixelCrop.y, pixelCrop.width, pixelCrop.height);

  // Set canvas width to final desired crop size
  canvas.width = pixelCrop.width;
  canvas.height = pixelCrop.height;

  // Paste generated rotate image at the top left corner
  ctx.putImageData(data, 0, 0);

  // Return as a blob
  return new Promise((resolve, reject) => {
    canvas.toBlob((file) => {
      if (file) {
        resolve({ file, url: URL.createObjectURL(file) });
      } else {
        reject(new Error('Failed to create blob'));
      }
    }, 'image/png');
  });
};

