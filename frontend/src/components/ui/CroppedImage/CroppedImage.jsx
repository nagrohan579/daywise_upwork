import { useState, useEffect } from 'react';
import { getCroppedImageUrl } from '../../../utils/imageCropUtils';

/**
 * Component that displays an image with crop transformations applied
 * @param {string} src - Original image URL
 * @param {Object} cropData - Crop data from database { x, y, zoom, rotation, croppedAreaPixels }
 * @param {string} className - CSS classes
 * @param {Object} style - Inline styles
 * @param {string} alt - Alt text
 * @param {...any} props - Other img props
 */
const CroppedImage = ({ src, cropData, className, style, alt, ...props }) => {
  const [displayUrl, setDisplayUrl] = useState(src);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    const applyCrop = async () => {
      if (!src) {
        setDisplayUrl(null);
        setIsLoading(false);
        return;
      }

      // If no crop data, use original
      if (!cropData || !cropData.croppedAreaPixels) {
        setDisplayUrl(src);
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        const croppedUrl = await getCroppedImageUrl(src, cropData);
        if (isMounted) {
          setDisplayUrl(croppedUrl);
        }
      } catch (error) {
        console.error('Error applying crop:', error);
        if (isMounted) {
          // Fallback to original on error
          setDisplayUrl(src);
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    applyCrop();

    return () => {
      isMounted = false;
      // Clean up object URL if we created one
      if (displayUrl && displayUrl.startsWith('blob:')) {
        URL.revokeObjectURL(displayUrl);
      }
    };
  }, [src, cropData]);

  if (!src) return null;

  return (
    <img
      src={displayUrl}
      alt={alt}
      className={className}
      style={{ ...style, opacity: isLoading ? 0.5 : 1 }}
      {...props}
    />
  );
};

export default CroppedImage;

