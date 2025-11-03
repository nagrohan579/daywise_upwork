/* eslint-disable react-refresh/only-export-components */
import { createContext, useCallback, useContext, useState } from 'react';
import { getCroppedImg } from '../utils/cropImage';

export const ImageCropContext = createContext({});

const defaultImage = null;
const defaultCrop = { x: 0, y: 0 };
const defaultRotation = 0;
const defaultZoom = 1;
const defaultCroppedAreaPixels = null;

export const ImageCropProvider = ({ children }) => {
  const [imageSrc, setImageSrc] = useState(defaultImage);
  const [crop, setCrop] = useState(defaultCrop);
  const [rotation, setRotation] = useState(defaultRotation);
  const [zoom, setZoom] = useState(defaultZoom);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState(defaultCroppedAreaPixels);
  const [aspectRatio, setAspectRatio] = useState(undefined);
  const [cropShape, setCropShape] = useState('rect');

  const onCropComplete = useCallback((croppedArea, croppedAreaPixels) => {
    setCroppedAreaPixels(croppedAreaPixels);
  }, []);

  const resetStates = useCallback(() => {
    setImageSrc(defaultImage);
    setCrop(defaultCrop);
    setRotation(defaultRotation);
    setZoom(defaultZoom);
    setCroppedAreaPixels(defaultCroppedAreaPixels);
    setAspectRatio(undefined);
    setCropShape('rect');
  }, []);

  const setImage = useCallback((image) => {
    setImageSrc(image);
  }, []);

  const getProcessedImage = useCallback(async () => {
    if (!imageSrc || !croppedAreaPixels) {
      return null;
    }

    try {
      const { file } = await getCroppedImg(imageSrc, croppedAreaPixels, rotation, { horizontal: false, vertical: false });
      return file;
    } catch (error) {
      console.error('Error processing image:', error);
      throw error;
    }
  }, [imageSrc, croppedAreaPixels, rotation]);

  const setAspect = useCallback((aspect) => {
    setAspectRatio(aspect);
  }, []);

  const setShape = useCallback((shape) => {
    setCropShape(shape);
  }, []);

  const value = {
    imageSrc,
    crop,
    setCrop,
    rotation,
    setRotation,
    zoom,
    setZoom,
    croppedAreaPixels,
    onCropComplete,
    aspectRatio,
    cropShape,
    setImage,
    resetStates,
    getProcessedImage,
    setAspect,
    setShape,
  };

  return <ImageCropContext.Provider value={value}>{children}</ImageCropContext.Provider>;
};

export const useImageCropContext = () => {
  const context = useContext(ImageCropContext);
  if (!context) {
    throw new Error('useImageCropContext must be used within ImageCropProvider');
  }
  return context;
};

