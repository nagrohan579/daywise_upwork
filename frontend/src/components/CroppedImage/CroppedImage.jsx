import { useState, useEffect } from 'react';
import { getCroppedImageUrl } from '../../utils/imageCropUtils';

/**
 * Component that displays an image with crop data applied
 * Uses the original image URL and applies crop transformations
 */
const CroppedImage = ({ 
  src, 
  cropData, 
  alt = '', 
  className = '',
  fallbackSrc = null, // Fallback if crop fails
  ...props 
}) => {
  const [croppedUrl, setCroppedUrl] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!src) {
      setIsLoading(false);
      return;
    }

    // If no crop data, just use original image
    if (!cropData || !cropData.croppedAreaPixels) {
      setCroppedUrl(src);
      setIsLoading(false);
      return;
    }

    // Generate cropped image URL
    let blobUrl = null;
    getCroppedImageUrl(src, cropData)
      .then((url) => {
        blobUrl = url;
        setCroppedUrl(url);
        setError(false);
      })
      .catch((err) => {
        console.error('Error creating cropped image:', err);
        setError(true);
        setCroppedUrl(fallbackSrc || src);
      })
      .finally(() => {
        setIsLoading(false);
      });

    // Cleanup blob URL on unmount or src change
    return () => {
      if (blobUrl && blobUrl.startsWith('blob:')) {
        URL.revokeObjectURL(blobUrl);
      }
    };
  }, [src, cropData, fallbackSrc]);

  if (isLoading) {
    return <div className={className} style={{ backgroundColor: '#f9faff', borderRadius: '8px' }} />;
  }

  if (!croppedUrl) {
    return null;
  }

  return (
    <img
      src={croppedUrl}
      alt={alt}
      className={className}
      {...props}
    />
  );
};

export default CroppedImage;

