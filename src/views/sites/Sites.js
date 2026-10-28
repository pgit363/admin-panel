import React, { useEffect, useRef, useState } from 'react';
import {

  CBadge,
  CButton,
  CCard,
  CCardBody,
  CCardHeader,
  CCol,
  CForm,
  CFormInput,
  CFormLabel,
  CFormSelect,
  CImage,
  CModal,
  CModalBody,
  CModalFooter,
  CModalHeader,
  CModalTitle,
  CPagination,
  CPaginationItem,
  CRow,
  CSpinner,
} from '@coreui/react';
import CIcon from '@coreui/icons-react';
import { cilLocationPin, cilPencil, cilTrash, cilGlobeAlt, cilTag, cilImage } from '@coreui/icons';
import apiService from 'src/services/apiService';
import AlertModal from 'src/components/AlertModal';
import DropdownSearch from '../../components/DropdownSearch';
import MultiSelectDropdown from '../../components/MultiSelectDropdown';
import ExpandableText from '../../components/ExpandableText';
import { awsUrl } from 'src/services/endpoints';
import { parseApiMessage } from 'src/utils/apiMessages';
import SiteGalleryModal from './SiteGalleryModal';

const emptyForm = {
  id: '',
  name: '',
  parent_id: '',
  category: '',
  categories: '',
  user_id: '',
  bus_stop_type: '',
  tag_line: '',
  description: '',
  domain_name: '',
  logo: '',
  icon: '',
  image: '',
  status: '',
  latitude: '',
  longitude: '',
  pin_code: '',
  speciality: '{}',
  rules: '{}',
  social_media: '{}',
  meta_data: '{}',
};

const Sites = () => {
  const [sites, setSites] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [links, setLinks] = useState([]);
  const [loading, setLoading] = useState(false);
  const [alert, setAlert] = useState(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [gallerySite, setGallerySite] = useState(null);
  const [initialFormData, setInitialFormData] = useState({});
  const [formData, setFormData] = useState(emptyForm);

  // Search filters — only committed to activeFilters on Search click
  const [searchFilters, setSearchFilters] = useState({ name: '', parent_id: '', categoryId: '' });
  const activeFilters = useRef({ name: '', parent_id: '', categoryId: '' });
  const [searchTrigger, setSearchTrigger] = useState(0);

  const [allCategories, setAllCategories] = useState([]);
  const [selectedParentCat, setSelectedParentCat] = useState('');
  const [subCategories, setSubCategories] = useState([]);

  useEffect(() => {
    fetchSites(currentPage);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPage, searchTrigger]);

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const data = await apiService('POST', 'listcategories', { apitype: 'list' });
        if (data.success) {
          const list = Array.isArray(data.data) ? data.data : (data.data.data || []);
          setAllCategories(list);
        }
      } catch (_) {}
    };
    fetchCategories();
  }, []);

  const showError = (msg) => setAlert({ type: 'danger', message: msg });
  const showSuccess = (msg) => setAlert({ type: 'success', message: msg });
  const clearAlert = () => setAlert(null);

  const fetchSites = async (page) => {
    const dataToSubmit = new FormData();
    dataToSubmit.append('apitype', 'list');
    dataToSubmit.append('global', 1);
    const filters = activeFilters.current;
    if (filters.name) dataToSubmit.append('search', filters.name);
    if (filters.categoryId) dataToSubmit.append('category_id', filters.categoryId);
    if (filters.parent_id) dataToSubmit.append('parent_id', filters.parent_id);

    setLoading(true);
    try {
      const data = await apiService('POST', `sites?page=${page}`, dataToSubmit);
      if (data.success === false) {
        showError(parseApiMessage(data.message));
        return;
      }
      if (data && data.data) {
        setSites(data.data.data || []);
        setLinks(data.data.links || []);
      } else {
        throw new Error('Invalid data structure');
      }
    } catch (err) {
      console.error('Error fetching sites:', err);
      showError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = () => {
    activeFilters.current = { ...searchFilters };
    if (currentPage !== 1) {
      setCurrentPage(1); // useEffect will trigger fetchSites
    } else {
      setSearchTrigger((t) => t + 1); // same page — force re-fetch via trigger
    }
  };

  const handlePaginationClick = (label) => {
    const cleanLabel = label.replace('&laquo;', '').replace('&raquo;', '').trim();
    if (cleanLabel === 'Previous') setCurrentPage((p) => Math.max(p - 1, 1));
    else if (cleanLabel === 'Next') setCurrentPage((p) => p + 1);
    else setCurrentPage(parseInt(cleanLabel));
  };

  const renderPaginationLabel = (label) =>
    label.replace('&laquo;', '').replace('&raquo;', '').trim();

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleFileChange = (e) => {
    const { name, files } = e.target;
    setFormData((prev) => ({ ...prev, [name]: files[0] }));
  };

  const openAddModal = () => {
    setFormData(emptyForm);
    setShowAddModal(true);
  };

  const openEditModal = (site) => {
    const data = {
      ...emptyForm,
      id: site.id,
      name: site.name ?? '',
      parent_id: site.parent_id ?? '',
      bus_stop_type: site.bus_stop_type ?? '',
      tag_line: site.tag_line ?? '',
      description: site.description ?? '',
      domain_name: site.domain_name ?? '',
      status: site.status ?? '',
      latitude: site.latitude ?? '',
      longitude: site.longitude ?? '',
      pin_code: site.pin_code ?? '',
      speciality: site.speciality ?? '{}',
      rules: site.rules ?? '{}',
      social_media: site.social_media ?? '{}',
      meta_data: site.meta_data ?? '{}',
    };
    setFormData(data);
    setInitialFormData(data);
    setShowEditModal(true);
  };

  const buildFormPayload = (data) => {
    const form = new FormData();
    if (data.id) form.append('id', data.id);
    if (data.name) form.append('name', data.name);
    if (data.parent_id) form.append('parent_id', data.parent_id);
    if (data.user_id) form.append('user_id', data.user_id);
    if (data.categories && data.categories.length > 0)
      form.append('categories', JSON.stringify(data.categories));
    if (data.bus_stop_type) form.append('bus_stop_type', data.bus_stop_type);
    if (data.tag_line) form.append('tag_line', data.tag_line);
    if (data.description) form.append('description', data.description);
    if (data.domain_name) form.append('domain_name', data.domain_name);
    if (data.logo) form.append('logo', data.logo);
    if (data.icon) form.append('icon', data.icon);
    if (data.image) form.append('image', data.image);
    form.append('status', data.status ? '1' : '0');
    if (data.latitude) form.append('latitude', data.latitude);
    if (data.longitude) form.append('longitude', data.longitude);
    if (data.pin_code) form.append('pin_code', data.pin_code);
    if (data.speciality) form.append('speciality', data.speciality);
    if (data.rules) form.append('rules', data.rules);
    if (data.social_media) form.append('social_media', data.social_media);
    if (data.meta_data) form.append('meta_data', data.meta_data);
    return form;
  };

  const handleAddSite = async () => {
    setLoading(true);
    try {
      const data = await apiService('POST', 'addSite', buildFormPayload(formData));
      if (!data.success) {
        showError(parseApiMessage(data.message));
        return;
      }
      setShowAddModal(false);
      showSuccess(data.message);
      fetchSites(currentPage);
    } catch (err) {
      console.error('Error adding site:', err);
      showError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const getChangedFormData = () => {
    const changed = {};
    Object.keys(formData).forEach((key) => {
      if (formData[key] !== initialFormData[key]) changed[key] = formData[key];
    });
    return changed;
  };

  const handleEditSite = async () => {
    const changed = getChangedFormData();
    const form = new FormData();
    if (formData.id) form.append('id', formData.id);
    Object.keys(changed).forEach((key) => {
      if (key === 'categories' && Array.isArray(changed[key]))
        form.append('categories', JSON.stringify(changed[key]));
      else if (key === 'status') form.append(key, changed[key] ? '1' : '0');
      else form.append(key, changed[key]);
    });

    setLoading(true);
    try {
      const data = await apiService('POST', 'updateSite', form);
      if (!data.success) {
        showError(parseApiMessage(data.message));
        return;
      }
      setShowEditModal(false);
      showSuccess(data.message);
      fetchSites(currentPage);
    } catch (err) {
      console.error('Error updating site:', err);
      showError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteSite = async (id) => {
    if (!window.confirm('Delete this site?')) return;
    setLoading(true);
    try {
      const data = await apiService('POST', 'deleteSite', { id });
      if (!data.success) {
        showError(parseApiMessage(data.message));
        return;
      }
      showSuccess(data.message);
      fetchSites(currentPage);
    } catch (err) {
      console.error('Error deleting site:', err);
      showError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCategoryChange = (selected) =>
    setFormData((prev) => ({ ...prev, categories: selected }));

  const siteFormFields = (
    <CForm>
      <CRow className="g-3">
        <CCol md={6}>
          <CFormLabel>Name</CFormLabel>
          <CFormInput name="name" value={formData.name} onChange={handleInputChange} />
        </CCol>
        <CCol md={6}>
          <CFormLabel>Bus Stop Type</CFormLabel>
          <CFormInput name="bus_stop_type" value={formData.bus_stop_type} onChange={handleInputChange} />
        </CCol>
        <CCol md={12}>
          <CFormLabel>City / Parent Site</CFormLabel>
          <DropdownSearch
            onChange={(id) => setFormData((p) => ({ ...p, parent_id: id }))}
            endpoint="sites"
            label="Cities"
            filter={[{ category: 'city' }]}
          />
        </CCol>
        <CCol md={12}>
          <CFormLabel>Categories</CFormLabel>
          <MultiSelectDropdown
            onChange={handleCategoryChange}
            endpoint="listcategories"
            label="Categories"
            filter={[{ apitype: 'dropdown' }]}
          />
        </CCol>
        <CCol md={12}>
          <CFormLabel>Tag Line</CFormLabel>
          <CFormInput name="tag_line" value={formData.tag_line} onChange={handleInputChange} />
        </CCol>
        <CCol md={12}>
          <CFormLabel>Description</CFormLabel>
          <CFormInput name="description" value={formData.description} onChange={handleInputChange} />
        </CCol>
        <CCol md={6}>
          <CFormLabel>Domain Name</CFormLabel>
          <CFormInput name="domain_name" value={formData.domain_name} onChange={handleInputChange} />
        </CCol>
        <CCol md={6}>
          <CFormLabel>Status</CFormLabel>
          <CFormSelect name="status" value={formData.status} onChange={handleInputChange}>
            <option value="1">Active</option>
            <option value="0">Inactive</option>
          </CFormSelect>
        </CCol>
        <CCol md={6}>
          <CFormLabel>Latitude</CFormLabel>
          <CFormInput name="latitude" value={formData.latitude} onChange={handleInputChange} />
        </CCol>
        <CCol md={6}>
          <CFormLabel>Longitude</CFormLabel>
          <CFormInput name="longitude" value={formData.longitude} onChange={handleInputChange} />
        </CCol>
        <CCol md={4}>
          <CFormLabel>Pin Code</CFormLabel>
          <CFormInput name="pin_code" value={formData.pin_code} onChange={handleInputChange} />
        </CCol>
        <CCol md={4}>
          <CFormLabel>Speciality (JSON)</CFormLabel>
          <CFormInput name="speciality" value={formData.speciality} onChange={handleInputChange} />
        </CCol>
        <CCol md={4}>
          <CFormLabel>Meta Data (JSON)</CFormLabel>
          <CFormInput name="meta_data" value={formData.meta_data} onChange={handleInputChange} />
        </CCol>
        <CCol md={4}>
          <CFormLabel>Logo</CFormLabel>
          <CFormInput type="file" name="logo" onChange={handleFileChange} />
        </CCol>
        <CCol md={4}>
          <CFormLabel>Icon</CFormLabel>
          <CFormInput type="file" name="icon" onChange={handleFileChange} />
        </CCol>
        <CCol md={4}>
          <CFormLabel>Image</CFormLabel>
          <CFormInput type="file" name="image" onChange={handleFileChange} />
        </CCol>
      </CRow>
    </CForm>
  );

  return (
    <CRow>
      <CCol xs={12}>
        {/* Search Bar */}
        <CCard className="mb-3">
          <CCardBody>
            <CForm
              className="row g-3 align-items-end"
              onSubmit={(e) => { e.preventDefault(); handleSearch(); }}
            >
              <CCol md={3}>
                <CFormLabel>Name</CFormLabel>
                <CFormInput
                  placeholder="Search by name..."
                  value={searchFilters.name}
                  onChange={(e) =>
                    setSearchFilters((p) => ({ ...p, name: e.target.value }))
                  }
                />
              </CCol>
              <CCol md={3}>
                <CFormLabel>City</CFormLabel>
                <DropdownSearch
                  onChange={(id) => setSearchFilters((p) => ({ ...p, parent_id: id }))}
                  endpoint="sites"
                  label="Cities"
                  filter={[{ category: 'city' }]}
                />
              </CCol>
              <CCol md={2}>
                <CFormLabel>Category</CFormLabel>
                <CFormSelect
                  value={selectedParentCat}
                  onChange={(e) => {
                    const catId = e.target.value;
                    setSelectedParentCat(catId);
                    const cat = allCategories.find((c) => String(c.id) === catId);
                    const subs = cat?.sub_categories || [];
                    setSubCategories(subs);
                    setSearchFilters((p) => ({ ...p, categoryId: '' }));
                  }}
                  style={{ color: '#212631', backgroundColor: '#fff' }}
                >
                  <option value="">All Categories</option>
                  {allCategories.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </CFormSelect>
              </CCol>
              <CCol md={2}>
                <CFormLabel>Sub Category</CFormLabel>
                <CFormSelect
                  value={searchFilters.categoryId}
                  onChange={(e) => setSearchFilters((p) => ({ ...p, categoryId: e.target.value }))}
                  disabled={subCategories.length === 0}
                  style={{ color: '#212631', backgroundColor: '#fff' }}
                >
                  <option value="">All</option>
                  {subCategories.map((s) => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </CFormSelect>
              </CCol>
              <CCol md="auto">
                <CButton color="primary" type="submit">Search</CButton>
              </CCol>
              <CCol md="auto">
                <CButton color="success" onClick={openAddModal}>+ Add Site</CButton>
              </CCol>
            </CForm>
          </CCardBody>
        </CCard>

        {/* Cards */}
        {loading ? (
          <div className="text-center py-5">
            <CSpinner color="primary" />
          </div>
        ) : sites.length === 0 ? (
          <CCard>
            <CCardBody className="text-center text-body-secondary py-5">
              No sites found.
            </CCardBody>
          </CCard>
        ) : (
          sites.map((site) => (
            <CCard key={site.id} className="mb-3">
              <CCardBody>
                <CRow className="g-3 align-items-start">
                  {/* Image column */}
                  <CCol xs={12} md={2} className="text-center">
                    {site.image ? (
                      <CImage
                        src={awsUrl(site.image)}
                        alt={site.name}
                        style={{ width: '100%', maxWidth: 120, height: 90, objectFit: 'cover', borderRadius: 8 }}
                      />
                    ) : site.icon ? (
                      <CImage
                        src={awsUrl(site.icon)}
                        alt={site.name}
                        style={{ width: 80, height: 80, objectFit: 'contain' }}
                      />
                    ) : (
                      <div
                        style={{
                          width: '100%', maxWidth: 120, height: 90, borderRadius: 8,
                          backgroundColor: 'var(--cui-secondary-bg)',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          color: 'var(--cui-secondary-color)', fontSize: 12,
                        }}
                      >
                        No Image
                      </div>
                    )}
                  </CCol>

                  {/* Main info */}
                  <CCol xs={12} md={7}>
                    <div className="d-flex align-items-center gap-2 flex-wrap mb-1">
                      <strong style={{ fontSize: 16 }}>{site.name}</strong>
                      {site.bus_stop_type && (
                        <CBadge color="info" shape="rounded-pill">{site.bus_stop_type}</CBadge>
                      )}
                      <CBadge color={site.status ? 'success' : 'secondary'} shape="rounded-pill">
                        {site.status ? 'Active' : 'Inactive'}
                      </CBadge>
                      {site.is_hot_place == 1 && (
                        <CBadge color="warning" shape="rounded-pill">Hot Place</CBadge>
                      )}
                    </div>

                    {/* Categories */}
                    {site.categories && site.categories.length > 0 && (
                      <div className="mb-1 d-flex flex-wrap gap-1">
                        {site.categories.map((cat) => (
                          <CBadge key={cat.id} color="primary" shape="rounded-pill" style={{ fontWeight: 400 }}>
                            <CIcon icon={cilTag} size="sm" className="me-1" />{cat.name}
                          </CBadge>
                        ))}
                      </div>
                    )}

                    {site.tag_line && (
                      <p className="text-body-secondary mb-1" style={{ fontSize: 13, fontStyle: 'italic' }}>
                        {site.tag_line}
                      </p>
                    )}

                    {site.description && (
                      <div style={{ fontSize: 13 }}>
                        <ExpandableText text={site.description} />
                      </div>
                    )}

                    <div className="d-flex flex-wrap gap-3 mt-2" style={{ fontSize: 12, color: 'var(--cui-secondary-color)' }}>
                      {site.domain_name && (
                        <span>
                          <CIcon icon={cilGlobeAlt} size="sm" className="me-1" />
                          {site.domain_name}
                        </span>
                      )}
                      {(site.latitude || site.longitude) && (
                        <span>
                          <CIcon icon={cilLocationPin} size="sm" className="me-1" />
                          {site.latitude}, {site.longitude}
                        </span>
                      )}
                      {site.pin_code && <span>PIN: {site.pin_code}</span>}
                    </div>
                  </CCol>

                  {/* Actions */}
                  <CCol xs={12} md={3} className="d-flex flex-column align-items-end gap-2">
                    {site.logo && (
                      <CImage
                        src={awsUrl(site.logo)}
                        alt="logo"
                        style={{ height: 32, objectFit: 'contain', marginBottom: 4 }}
                      />
                    )}
                    <div className="d-flex gap-2">
                      <CButton
                        color="warning"
                        size="sm"
                        onClick={() => openEditModal(site)}
                      >
                        <CIcon icon={cilPencil} className="me-1" />Edit
                      </CButton>
                      <CButton
                        color="info"
                        size="sm"
                        onClick={() => setGallerySite(site)}
                      >
                        <CIcon icon={cilImage} className="me-1" />Gallery
                      </CButton>
                      <CButton
                        color="danger"
                        size="sm"
                        onClick={() => handleDeleteSite(site.id)}
                      >
                        <CIcon icon={cilTrash} className="me-1" />Delete
                      </CButton>
                    </div>
                  </CCol>
                </CRow>
              </CCardBody>
            </CCard>
          ))
        )}

        {/* Pagination */}
        {links.length > 0 && (
          <CPagination className="mt-2">
            {links.map((link, index) => (
              <CPaginationItem
                key={index}
                active={link.active}
                disabled={!link.url}
                onClick={() => link.url && handlePaginationClick(link.label)}
              >
                {renderPaginationLabel(link.label)}
              </CPaginationItem>
            ))}
          </CPagination>
        )}
      </CCol>

      {/* Add Modal */}
      <CModal visible={showAddModal} onClose={() => setShowAddModal(false)} size="lg" scrollable>
        <CModalHeader onClose={() => setShowAddModal(false)}>
          <CModalTitle>Add Site</CModalTitle>
        </CModalHeader>
        <CModalBody>{siteFormFields}</CModalBody>
        <CModalFooter>
          <CButton color="secondary" onClick={() => setShowAddModal(false)}>Cancel</CButton>
          <CButton color="primary" onClick={handleAddSite} disabled={loading}>
            {loading ? <CSpinner size="sm" /> : 'Add Site'}
          </CButton>
        </CModalFooter>
      </CModal>

      {/* Edit Modal */}
      <CModal visible={showEditModal} onClose={() => setShowEditModal(false)} size="lg" scrollable>
        <CModalHeader onClose={() => setShowEditModal(false)}>
          <CModalTitle>Edit Site — {formData.name}</CModalTitle>
        </CModalHeader>
        <CModalBody>{siteFormFields}</CModalBody>
        <CModalFooter>
          <CButton color="secondary" onClick={() => setShowEditModal(false)}>Cancel</CButton>
          <CButton color="primary" onClick={handleEditSite} disabled={loading}>
            {loading ? <CSpinner size="sm" /> : 'Save Changes'}
          </CButton>
        </CModalFooter>
      </CModal>
      <SiteGalleryModal
        site={gallerySite}
        visible={!!gallerySite}
        onClose={() => setGallerySite(null)}
        onError={showError}
        onSuccess={showSuccess}
      />
      <AlertModal alert={alert} onClose={clearAlert} />

    </CRow>
  );
};

export default Sites;
