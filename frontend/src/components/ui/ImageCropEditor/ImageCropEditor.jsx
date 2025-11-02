import { useState, useCallback, useEffect } from 'react';
import Cropper from 'react-easy-crop';
import { Modal } from 'react-bootstrap';
import { IoClose } from 'react-icons/io5';
import { Button } from '../../index';
import { createImageFromCrop } from '../../../utils/imageCropUtils';
import './ImageCropEditor.css';

const ImageCropEditor = ({ 
  show, 
  onClose, 
  imageSrc, 
  onSave, 
  initialCropData = null,
  aspectRatio = 1, // 1 for circle/profile, undefined for logo
  shape = 'rect' // 'rect' or 'round'
}) => {
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);

  // Initialize crop from previous data when modal opens or initialCropData changes
  useEffect(() => {
    if (initialCropData && show) {
      setCrop({ x: initialCropData.x || 0, y: initialCropData.y || 0 });
      setZoom(initialCropData.zoom || 1);
      setRotation(initialCropData.rotation || 0);
    } else if (!initialCropData && show) {
      // Reset to defaults when opening without previous data
      setCrop({ x: 0, y: 0 });
      setZoom(1);
      setRotation(0);
    }
  }, [initialCropData, show]);

  const onCropComplete = useCallback((croppedArea, croppedAreaPixels) => {
    setCroppedAreaPixels(croppedAreaPixels);
  }, []);

  const handleSave = async () => {
    setIsProcessing(true);
    try {
      let croppedBlob = null;
      
      // If we have crop area pixels, create the cropped image
      if (croppedAreaPixels) {
        croppedBlob = await createImageFromCrop(
          imageSrc,
          croppedAreaPixels,
          rotation
        );
      }

      // Create crop data object
      const cropData = {
        x: crop.x,
        y: crop.y,
        zoom,
        rotation,
        croppedAreaPixels,
      };
      
      // Call onSave with crop data and blob
      await onSave(cropData, croppedBlob);
      onClose();
    } catch (error) {
      console.error('Error processing crop:', error);
    } finally {
      setIsProcessing(false);
    }
  };


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
              cropShape={shape}
              onCropChange={setCrop}
              onZoomChange={setZoom}
              onRotationChange={setRotation}
              onCropComplete={onCropComplete}
            />
          </div>
          
          <div className="controls">
            <div className="control-group">
              <div className="control-row">
                <label>Rotation</label>
                <input
                  type="range"
                  min={0}
                  max={360}
                  step={1}
                  value={rotation}
                  onChange={(e) => setRotation(parseInt(e.target.value))}
                  className="slider"
                />
                <span className="value">{rotation}°</span>
              </div>
            </div>
            
            <div className="control-group">
              <div className="control-row">
                <label>Zoom</label>
                <span className="value">{zoom.toFixed(1)}x</span>
                <input
                  type="range"
                  min={1}
                  max={3}
                  step={0.1}
                  value={zoom}
                  onChange={(e) => setZoom(parseFloat(e.target.value))}
                  className="slider"
                />
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
          disabled={isProcessing}
        />
      </Modal.Footer>
    </Modal>
  );
};

export default ImageCropEditor;

