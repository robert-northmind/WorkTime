import React, { useRef, useState } from 'react';
import ReactCrop, {
  centerCrop,
  makeAspectCrop,
  type Crop,
  type PixelCrop,
} from 'react-image-crop';
import 'react-image-crop/dist/ReactCrop.css';
import { cropImageToDataUrl } from '../services/auth/ProfileUtils';

type Props = {
  srcUrl: string;
  onConfirm: (dataUrl: string) => void;
  onCancel: () => void;
};

export const PhotoCropModal: React.FC<Props> = ({ srcUrl, onConfirm, onCancel }) => {
  const imgRef = useRef<HTMLImageElement>(null);
  const [crop, setCrop] = useState<Crop>();
  const [completedCrop, setCompletedCrop] = useState<PixelCrop>();

  const onImageLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
    const { width, height } = e.currentTarget;
    const initialCrop = centerCrop(
      makeAspectCrop({ unit: '%', width: 90 }, 1, width, height),
      width,
      height,
    );
    setCrop(initialCrop);
    // Pre-fill completedCrop so "Use photo" works without any interaction
    setCompletedCrop({
      unit: 'px',
      x: (initialCrop.x / 100) * width,
      y: (initialCrop.y / 100) * height,
      width: (initialCrop.width / 100) * width,
      height: (initialCrop.height / 100) * height,
    });
  };

  const handleConfirm = () => {
    if (!imgRef.current || !completedCrop) return;
    onConfirm(cropImageToDataUrl(imgRef.current, completedCrop));
  };

  const canConfirm = Boolean(completedCrop?.width && completedCrop?.height);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onCancel(); }}
    >
      <div className="bg-white rounded-xl shadow-xl w-full max-w-sm flex flex-col overflow-hidden">
        <div className="px-5 pt-5 pb-3">
          <h3 className="text-base font-semibold text-gray-900">Crop photo</h3>
          <p className="text-xs text-gray-500 mt-0.5">Drag to reposition · Resize from corners</p>
        </div>

        <div className="flex-1 overflow-auto bg-gray-100 flex items-center justify-center p-4">
          <ReactCrop
            crop={crop}
            onChange={setCrop}
            onComplete={setCompletedCrop}
            circularCrop
            aspect={1}
            keepSelection
          >
            <img
              ref={imgRef}
              src={srcUrl}
              alt="Crop preview"
              onLoad={onImageLoad}
              className="max-h-[60vh] max-w-full object-contain"
            />
          </ReactCrop>
        </div>

        <div className="flex gap-3 px-5 py-4">
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={!canConfirm}
            className="flex-1 px-4 py-2 bg-blue-600 rounded-lg text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Use photo
          </button>
        </div>
      </div>
    </div>
  );
};
