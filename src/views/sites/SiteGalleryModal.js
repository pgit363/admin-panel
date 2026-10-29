import React, { useEffect, useRef, useState } from 'react';
import {
  CBadge,
  CButton,
  CFormInput,
  CModal,
  CModalBody,
  CModalFooter,
  CModalHeader,
  CModalTitle,
  CSpinner,
} from '@coreui/react';
import CIcon from '@coreui/icons-react';
import { cilCloudUpload, cilImage } from '@coreui/icons';
import apiService from 'src/services/apiService';
import { awsUrl } from 'src/services/endpoints';
import { parseApiMessage } from 'src/utils/apiMessages';

// Mirrors config('constants.image_rules.gallery') on the backend — stated up front
// because the server rejects the whole batch when one file misses the ratio.
const GUIDELINE = 'Square (1:1, ±10%), at least 720px wide, under 1 MB each. Up to 20 at a time.';

/**
 * Gallery manager for one site. Kept out of Sites.js because that view is already
 * carrying the add and edit forms, and the gallery is a self-contained three-call
 * surface (list / upload / delete).
 */
const SiteGalleryModal = ({ site, visible, onClose, onError, onSuccess }) => {
  const [images, setImages] = useState([]);
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const inputRef = useRef(null);

  useEffect(() => {
    if (visible && site?.id) fetchGallery();
    if (!visible) {
      setImages([]);
      setFiles([]);
      if (inputRef.current) inputRef.current.value = '';
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, site?.id]);

  const fetchGallery = async () => {
    setLoading(true);
    try {
      const data = await apiService('POST', 'getSiteGallery', { site_id: site.id });
      if (!data.success) {
        onError(parseApiMessage(data.message));
        return;
      }
      setImages(data.data || []);
    } catch (err) {
      onError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleUpload = async () => {
    if (!files.length) return;
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('site_id', site.id);
      files.forEach((f) => fd.append('images[]', f));

      const data = await apiService('POST', 'uploadSiteGallery', fd);
      if (!data.success) {
        onError(parseApiMessage(data.message));
        return;
      }
      onSuccess(data.message || 'Photos uploaded.');
      setFiles([]);
      if (inputRef.current) inputRef.current.value = '';
      fetchGallery();
    } catch (err) {
      onError(err.message);
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (galleryId) => {
    if (!window.confirm('Remove this photo?')) return;
    setDeletingId(galleryId);
    try {
      const data = await apiService('POST', 'deleteSiteGallery', { gallery_id: galleryId });
      if (!data.success) {
        onError(parseApiMessage(data.message));
        return;
      }
      setImages((prev) => prev.filter((g) => g.id !== galleryId));
    } catch (err) {
      onError(err.message);
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <CModal visible={visible} onClose={onClose} size="lg" scrollable>
      <CModalHeader>
        <CModalTitle className="d-flex align-items-center gap-2">
          <CIcon icon={cilImage} />
          Gallery — {site?.name}
          <CBadge color="info" shape="rounded-pill">{images.length}</CBadge>
        </CModalTitle>
      </CModalHeader>

      <CModalBody>
        {loading ? (
          <div className="text-center py-4"><CSpinner color="primary" /></div>
        ) : images.length === 0 ? (
          <p className="text-body-secondary text-center py-3 mb-0">
            No photos in this gallery yet.
          </p>
        ) : (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(110px, 1fr))',
              gap: 8,
              marginBottom: 16,
            }}
          >
            {images.map((img) => (
              <div key={img.id} style={{ position: 'relative', borderRadius: 6, overflow: 'hidden' }}>
                <img
                  src={awsUrl(img.path)}
                  alt={img.title || ''}
                  style={{ width: '100%', aspectRatio: '1 / 1', objectFit: 'cover', display: 'block' }}
                />
                <button
                  onClick={() => handleDelete(img.id)}
                  disabled={deletingId === img.id}
                  style={{
                    position: 'absolute', top: 4, right: 4,
                    background: 'rgba(220,53,69,0.85)', border: 'none', borderRadius: '50%',
                    width: 22, height: 22, cursor: 'pointer', color: '#fff',
                    fontSize: 14, lineHeight: 1,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}
                  title="Remove photo"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        )}

        <div className="d-flex align-items-center gap-2 flex-wrap">
          <CFormInput
            type="file"
            multiple
            accept="image/jpeg,image/jpg,image/png,image/webp"
            ref={inputRef}
            onChange={(e) => setFiles(Array.from(e.target.files))}
            style={{ maxWidth: 320 }}
          />
          <CButton color="primary" size="sm" onClick={handleUpload} disabled={!files.length || uploading}>
            {uploading ? (
              <CSpinner size="sm" />
            ) : (
              <>
                <CIcon icon={cilCloudUpload} className="me-1" />
                {files.length ? `Upload ${files.length} photo${files.length > 1 ? 's' : ''}` : 'Upload Photos'}
              </>
            )}
          </CButton>
        </div>
        <div style={{ fontSize: 11, color: 'var(--cui-secondary-color)', marginTop: 6 }}>
          {GUIDELINE}
        </div>
      </CModalBody>

      <CModalFooter>
        <CButton color="secondary" onClick={onClose}>Close</CButton>
      </CModalFooter>
    </CModal>
  );
};

export default SiteGalleryModal;
