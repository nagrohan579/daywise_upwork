import { useState, useEffect, useRef, useMemo } from 'react';

/**
 * Component that displays an image with crop transformations applied
 * Uses backend endpoint to avoid CORS issues
 * @param {string} src - Original image URL
 * @param {Object} cropData - Crop data from database { x, y, zoom, rotation, croppedAreaPixels }
 * @param {string} className - CSS classes
 * @param {Object} style - Inline styles
 * @param {string} alt - Alt text
 * @param {string} fallbackSrc - Fallback image URL if crop fails
 * @param {...any} props - Other img props
 */
const CroppedImage = ({ 
  src, 
  cropData, 
  className = '',
  style,
  alt = '',
  fallbackSrc = null,
  ...props 
}) => {
  const [croppedUrl, setCroppedUrl] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(false);
  const blobUrlRef = useRef(null);
  
  // Create a stable key from crop data to force re-render when it changes
  const cropDataKey = useMemo(() => {
    if (!cropData || !cropData.croppedAreaPixels) return null;
    return JSON.stringify({
      x: cropData.croppedAreaPixels.x,
      y: cropData.croppedAreaPixels.y,
      width: cropData.croppedAreaPixels.width,
      height: cropData.croppedAreaPixels.height,
      rotation: cropData.rotation || 0
    });
  }, [cropData]);

  useEffect(() => {
    console.log('CroppedImage - useEffect triggered', {
      src,
      hasCropData: !!cropData,
      cropDataKey,
      cropData: cropData ? JSON.stringify(cropData).substring(0, 200) : null
    });

    // Cleanup previous blob URL
    if (blobUrlRef.current) {
      URL.revokeObjectURL(blobUrlRef.current);
      blobUrlRef.current = null;
    }

    if (!src) {
      console.log('CroppedImage - No src, clearing');
      setIsLoading(false);
      setCroppedUrl(null);
      setError(false);
      return;
    }

    // If no crop data, just use original image
    if (!cropData || !cropData.croppedAreaPixels) {
      console.log('CroppedImage - No crop data, using original image');
      setCroppedUrl(src);
      setIsLoading(false);
      setError(false);
      return;
    }

    // Validate crop data structure
    const pixels = cropData.croppedAreaPixels;
    if (!pixels || typeof pixels.x !== 'number' || typeof pixels.y !== 'number' || 
        !pixels.width || !pixels.height || pixels.width <= 0 || pixels.height <= 0) {
      console.error('CroppedImage - Invalid crop data structure:', {
        cropData,
        pixels,
        xType: typeof pixels?.x,
        yType: typeof pixels?.y,
        width: pixels?.width,
        height: pixels?.height
      });
      setCroppedUrl(src);
      setIsLoading(false);
      setError(false);
      return;
    }

    console.log('CroppedImage - Valid crop data, applying crop:', {
      x: pixels.x,
      y: pixels.y,
      width: pixels.width,
      height: pixels.height,
      rotation: cropData.rotation || 0
    });

    // Generate cropped image URL using backend endpoint (avoids CORS issues)
    setIsLoading(true);
    setError(false);
    
    let cancelled = false;
    
    // Use backend endpoint to get cropped image
    const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';
    const cropDataParam = encodeURIComponent(JSON.stringify(cropData));
    const croppedImageUrl = `${apiUrl}/api/branding/cropped-image?imageUrl=${encodeURIComponent(src)}&cropData=${cropDataParam}`;
    
    // Test if the image loads
    const testImage = new Image();
    testImage.onload = () => {
      if (cancelled) return;
      console.log('CroppedImage - Successfully loaded cropped image from backend');
      setCroppedUrl(croppedImageUrl);
      setError(false);
      setIsLoading(false);
    };
    testImage.onerror = (err) => {
      if (cancelled) return;
      console.error('CroppedImage - Error loading cropped image from backend:', err);
      setError(true);
      setCroppedUrl(fallbackSrc || src);
      setIsLoading(false);
    };
    testImage.src = croppedImageUrl;

    // Cleanup on unmount or when dependencies change
    return () => {
      cancelled = true;
      if (blobUrlRef.current) {
        URL.revokeObjectURL(blobUrlRef.current);
        blobUrlRef.current = null;
      }
    };
  }, [src, cropDataKey, fallbackSrc]);

  if (isLoading) {
    return (
      <div 
        className={className} 
        style={{ 
          backgroundColor: '#f9faff', 
          borderRadius: '8px',
          display: 'inline-block',
          ...style
        }} 
      />
    );
  }

  if (!croppedUrl) {
    return null;
  }

  return (
    <img
      src={croppedUrl}
      alt={alt}
      className={className}
      style={{ ...style, opacity: isLoading ? 0.5 : 1 }}
      {...props}
      onError={(e) => {
        console.error('CroppedImage - Image load error, using fallback');
        if (fallbackSrc && e.currentTarget.src !== fallbackSrc) {
          e.currentTarget.src = fallbackSrc;
        } else if (src && e.currentTarget.src !== src) {
          e.currentTarget.src = src;
        }
        if (props.onError) {
          props.onError(e);
        }
      }}
    />
  );
};

export default CroppedImage;

