import { useEffect, useState, useRef } from 'react';
import Cropper from 'react-easy-crop';
import { Modal } from 'react-bootstrap';
import { IoClose } from 'react-icons/io5';
import { Button } from '../../index';
import { useImageCropContext } from '../../../providers/ImageCropProvider';
import './ImageCropEditor.css';

const ImageCropEditor = ({ 
  show, 
  onClose, 
  onSave,
}) => {
  const {
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
    getProcessedImage,
  } = useImageCropContext();

  const [isProcessing, setIsProcessing] = useState(false);

  const handleSave = async () => {
    if (!croppedAreaPixels) {
      console.warn('ImageCropEditor - No crop area selected');
      return;
    }

    console.log('ImageCropEditor - Starting save, croppedAreaPixels:', croppedAreaPixels);
    setIsProcessing(true);
    try {
      const croppedFile = await getProcessedImage();
      
      if (!croppedFile) {
        throw new Error('Failed to process image');
      }

      // Create crop data object for storage
      const cropData = {
        x: crop.x,
        y: crop.y,
        zoom,
        rotation,
        croppedAreaPixels,
      };

      console.log('ImageCropEditor - Crop data to save:', cropData);
      await onSave(cropData, croppedFile);
      console.log('ImageCropEditor - Save completed successfully');
      onClose();
    } catch (error) {
      console.error('ImageCropEditor - Error processing crop:', error);
      // Don't close on error - let user try again
    } finally {
      setIsProcessing(false);
    }
  };


  if (!imageSrc) {
    return null;
  }

  return (
    <Modal
      show={show}
      onHide={onClose}
      centered
      backdrop="static"
      className="image-crop-modal"
    >
      <Modal.Header>
        <Modal.Title>Crop & Edit Image</Modal.Title>
        <button className="close-btn" onClick={onClose}>
          <IoClose size={20} color="#64748B" />
        </button>
      </Modal.Header>
      <Modal.Body>
        <div className="crop-container">
          <div className="crop-wrapper">
            <Cropper
              image={imageSrc}
              crop={crop}
              zoom={zoom}
              rotation={rotation}
              aspect={aspectRatio}
              cropShape={cropShape}
              onCropChange={setCrop}
              onZoomChange={setZoom}
              onRotationChange={setRotation}
              onCropComplete={onCropComplete}
            />
          </div>
          
          <div className="controls">
            <div className="control-group control-group-rotation">
              <div className="control-row control-row-rotation">
                <label className="label-rotation">Rotation</label>
                <input
                  type="range"
                  min={0}
                  max={360}
                  step={1}
                  value={rotation}
                  onChange={(e) => setRotation(parseInt(e.target.value))}
                  className="slider slider-rotation"
                  id="rotation-slider"
                />
                <span className="value value-rotation">{rotation}°</span>
              </div>
            </div>
            
            <div className="control-group control-group-zoom">
              <div className="control-row control-row-zoom">
                <label className="label-zoom">Zoom</label>
                <input
                  type="range"
                  min={1}
                  max={3}
                  step={0.1}
                  value={zoom}
                  onChange={(e) => setZoom(parseFloat(e.target.value))}
                  className="slider slider-zoom"
                  id="zoom-slider"
                />
                <span className="value value-zoom">{zoom.toFixed(1)}x</span>
              </div>
            </div>
          </div>
        </div>
      </Modal.Body>
      <Modal.Footer>
        <Button
          text="Cancel"
          onClick={onClose}
          style={{
            backgroundColor: "transparent",
            color: "#64748B",
            border: "1px solid #E0E9FE",
          }}
        />
        <Button
          text={isProcessing ? "Processing..." : "Save"}
          onClick={handleSave}
          disabled={isProcessing || !croppedAreaPixels}
        />
      </Modal.Footer>
    </Modal>
  );
};

export default ImageCropEditor;
