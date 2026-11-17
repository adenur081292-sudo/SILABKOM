import React, { useState, useMemo, useRef, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { GalleryCategory, GalleryImage } from '../types';
import {
  Images,
  Plus,
  Search,
  Calendar,
  Eye,
  Edit2,
  Trash2,
  X,
  Upload,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Minimize2,
  RotateCcw,
  FolderCog,
  CheckCircle2,
  AlertCircle,
  User,
  Tag,
  ChevronDown,
  FileImage,
} from 'lucide-react';
import { ConfirmModal } from '../components/ConfirmModal';

const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
const ALLOWED_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.webp'];
const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB

export const GalleryView: React.FC = () => {
  const {
    galleryImages,
    galleryCategories,
    currentRole,
    hasPermission,
    saveGalleryImage,
    deleteGalleryImage,
    saveGalleryCategory,
    deleteGalleryCategory,
    addToast,
  } = useApp();

  // Only Administrator (or role explicitly granted manageGallery by Administrator) can mutate gallery & categories
  const canManageGallery = currentRole === 'admin' || hasPermission('manageGallery');

  // Search, Filters, Sorting, Load More Pagination
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [filterDate, setFilterDate] = useState<string>('');
  const [sortOrder, setSortOrder] = useState<'newest' | 'oldest'>('newest');
  const [visibleLimit, setVisibleLimit] = useState<number>(9);

  // Add / Edit Image Modal State
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [editingImage, setEditingImage] = useState<GalleryImage | null>(null);
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState(galleryCategories[0]?.name || 'Lain-lain');
  const [description, setDescription] = useState('');
  const [notes, setNotes] = useState('');
  const [uploadDate, setUploadDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [status, setStatus] = useState<'Aktif' | 'Arsip'>('Aktif');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string>('');
  const [fileError, setFileError] = useState<string>('');
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Lightbox / Image Viewer State
  const [lightboxImage, setLightboxImage] = useState<GalleryImage | null>(null);
  const [zoomLevel, setZoomLevel] = useState<number>(1);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const lightboxContainerRef = useRef<HTMLDivElement>(null);

  // Delete Image Confirmation State
  const [deleteTargetImage, setDeleteTargetImage] = useState<GalleryImage | null>(null);

  // Category Management Modal State (Admin Only)
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<GalleryCategory | null>(null);
  const [catNameInput, setCatNameInput] = useState('');
  const [catDescInput, setCatDescInput] = useState('');
  const [deleteTargetCategory, setDeleteTargetCategory] = useState<GalleryCategory | null>(null);

  // Clean up object URLs on unmount/change
  useEffect(() => {
    return () => {
      if (previewUrl && previewUrl.startsWith('blob:')) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  // Listen to browser fullscreen exit (e.g. Esc key) and Esc close for Lightbox
  useEffect(() => {
    const onFullscreenChange = () => {
      setIsFullscreen(Boolean(document.fullscreenElement));
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && lightboxImage) {
        if (document.fullscreenElement) {
          document.exitFullscreen().catch(() => {});
        } else {
          setLightboxImage(null);
        }
      }
    };
    document.addEventListener('fullscreenchange', onFullscreenChange);
    window.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('fullscreenchange', onFullscreenChange);
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [lightboxImage]);

  // Reset pagination when filters change
  useEffect(() => {
    setVisibleLimit(9);
  }, [searchQuery, filterCategory, filterDate, sortOrder]);

  // Visible images based on role (regular users see active images; Admin sees all)
  const scopedImages = useMemo(() => {
    if (canManageGallery) return galleryImages;
    return galleryImages.filter((img) => img.status === 'Aktif');
  }, [galleryImages, canManageGallery]);

  const categoryCounts = useMemo(() => {
    const map: Record<string, number> = {};
    for (const img of scopedImages) {
      map[img.category] = (map[img.category] || 0) + 1;
    }
    return map;
  }, [scopedImages]);

  const filteredImages = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const list = scopedImages.filter((img) => {
      if (filterCategory !== 'all' && img.category !== filterCategory) return false;
      if (filterDate && img.uploadDate !== filterDate) return false;
      if (q) {
        return (
          img.title.toLowerCase().includes(q) ||
          img.description.toLowerCase().includes(q) ||
          img.category.toLowerCase().includes(q)
        );
      }
      return true;
    });

    return [...list].sort((a, b) => {
      const aKey = `${a.uploadDate || ''}_${a.createdAt || ''}`;
      const bKey = `${b.uploadDate || ''}_${b.createdAt || ''}`;
      return sortOrder === 'newest' ? bKey.localeCompare(aKey) : aKey.localeCompare(bKey);
    });
  }, [scopedImages, filterCategory, filterDate, searchQuery, sortOrder]);

  const displayedImages = useMemo(
    () => filteredImages.slice(0, visibleLimit),
    [filteredImages, visibleLimit]
  );

  const hasMore = visibleLimit < filteredImages.length;

  // Helpers: Open Add / Edit Modal
  const clearSelectedFile = (restoreOriginal = true) => {
    if (previewUrl && previewUrl.startsWith('blob:')) {
      URL.revokeObjectURL(previewUrl);
    }
    setSelectedFile(null);
    setFileError('');
    setUploadProgress(0);
    if (fileInputRef.current) fileInputRef.current.value = '';
    setPreviewUrl(restoreOriginal && editingImage ? editingImage.imageUrl : '');
  };

  const handleOpenAddModal = () => {
    if (!canManageGallery) return;
    setEditingImage(null);
    setTitle('');
    setCategory(
      filterCategory !== 'all'
        ? filterCategory
        : galleryCategories[0]?.name || 'Denah Ruangan Laboratorium Komputer'
    );
    setDescription('');
    setNotes('');
    setUploadDate(new Date().toISOString().split('T')[0]);
    setStatus('Aktif');
    setSelectedFile(null);
    setPreviewUrl('');
    setFileError('');
    setUploadProgress(0);
    setIsFormModalOpen(true);
  };

  const handleOpenEditModal = (img: GalleryImage) => {
    if (!canManageGallery) return;
    setEditingImage(img);
    setTitle(img.title);
    setCategory(img.category);
    setDescription(img.description);
    setNotes(img.notes || '');
    setUploadDate(img.uploadDate || new Date().toISOString().split('T')[0]);
    setStatus(img.status || 'Aktif');
    setSelectedFile(null);
    setPreviewUrl(img.imageUrl);
    setFileError('');
    setUploadProgress(0);
    setIsFormModalOpen(true);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const lowerName = file.name.toLowerCase();
    const isValidExt = ALLOWED_EXTENSIONS.some((ext) => lowerName.endsWith(ext));
    const isValidMime = ALLOWED_IMAGE_TYPES.includes(file.type);

    if (!isValidExt && !isValidMime) {
      const msg = 'Format file tidak didukung. Gunakan JPG, JPEG, PNG, atau WEBP.';
      setFileError(msg);
      addToast('error', 'Format File Ditolak', msg);
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    if (file.size > MAX_FILE_SIZE_BYTES) {
      const msg = `Ukuran file terlalu besar (${(file.size / (1024 * 1024)).toFixed(2)} MB). Maksimal 10 MB.`;
      setFileError(msg);
      addToast('error', 'Ukuran File Melebihi Batas', msg);
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    if (previewUrl && previewUrl.startsWith('blob:')) {
      URL.revokeObjectURL(previewUrl);
    }

    const objectUrl = URL.createObjectURL(file);
    setSelectedFile(file);
    setPreviewUrl(objectUrl);
    setFileError('');
  };

  const handleSubmitForm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canManageGallery) return;

    if (!title.trim() || !category.trim()) {
      addToast('error', 'Data Belum Lengkap', 'Judul gambar dan kategori wajib diisi.');
      return;
    }

    if (!editingImage && !selectedFile) {
      addToast('error', 'Gambar Belum Dipilih', 'Silakan unggah file gambar (JPG, PNG, atau WEBP).');
      return;
    }

    setIsUploading(true);
    setUploadProgress(5);
    try {
      const result = await saveGalleryImage(
        {
          id: editingImage?.id,
          imageId: editingImage?.imageId || editingImage?.id,
          title: title.trim(),
          category: category.trim(),
          description: description.trim(),
          notes: notes.trim(),
          imageUrl: editingImage?.imageUrl || '',
          storagePath: editingImage?.storagePath || '',
          uploadDate,
          createdAt: editingImage?.createdAt,
          uploadedBy: editingImage?.uploadedBy,
          status,
        },
        selectedFile,
        (pct) => setUploadProgress(pct)
      );

      if (result.success) {
        if (previewUrl && previewUrl.startsWith('blob:')) {
          URL.revokeObjectURL(previewUrl);
        }
        setIsFormModalOpen(false);
        setSelectedFile(null);
        setPreviewUrl('');
      }
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  // Lightbox Controls
  const openLightbox = (img: GalleryImage) => {
    setLightboxImage(img);
    setZoomLevel(1);
    setIsFullscreen(false);
  };

  const closeLightbox = () => {
    if (document.fullscreenElement) {
      document.exitFullscreen().catch(() => {});
    }
    setIsFullscreen(false);
    setLightboxImage(null);
  };

  const toggleFullscreen = async () => {
    if (!lightboxContainerRef.current) return;
    try {
      if (!document.fullscreenElement) {
        await lightboxContainerRef.current.requestFullscreen();
        setIsFullscreen(true);
      } else {
        await document.exitFullscreen();
        setIsFullscreen(false);
      }
    } catch {
      // Graceful fallback toggle inside viewport
      setIsFullscreen((prev) => !prev);
    }
  };

  // Category Management Submit
  const handleSaveCategoryForm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canManageGallery) return;
    const res = await saveGalleryCategory({
      id: editingCategory?.id,
      name: catNameInput.trim(),
      description: catDescInput.trim(),
      order: editingCategory?.order ?? galleryCategories.length + 1,
      createdAt: editingCategory?.createdAt,
    });
    if (res.success) {
      setEditingCategory(null);
      setCatNameInput('');
      setCatDescInput('');
    }
  };

  const latestUploadDate = useMemo(() => {
    if (scopedImages.length === 0) return '-';
    return scopedImages
      .map((i) => i.uploadDate)
      .filter(Boolean)
      .sort()
      .reverse()[0] || '-';
  }, [scopedImages]);

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Header Section */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <div className="text-xs font-semibold text-cyan-700 mb-0.5">
            Dokumentasi Visual · SMKN 15 Pandeglang
          </div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2.5">
            <Images className="w-6 h-6 text-cyan-600" />
            Galeri Laboratorium
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Pusat dokumentasi visual denah ruang, topologi LAN, tata letak PC-1 s.d. PC-20, perangkat server, kegiatan praktikum, pemeliharaan, dan TKA/UKK.
          </p>
        </div>

        {canManageGallery && (
          <div className="flex flex-wrap items-center gap-2 text-xs shrink-0">
            <button
              type="button"
              onClick={() => {
                setEditingCategory(null);
                setCatNameInput('');
                setCatDescInput('');
                setIsCategoryModalOpen(true);
              }}
              className="px-3.5 py-2.5 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
            >
              <FolderCog className="w-4 h-4 text-cyan-600" />
              Kelola Kategori ({galleryCategories.length})
            </button>
            <button
              type="button"
              onClick={handleOpenAddModal}
              className="px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold flex items-center gap-1.5 shadow-sm cursor-pointer whitespace-nowrap"
            >
              <Plus className="w-4 h-4 text-cyan-400" />
              + TAMBAH GAMBAR
            </button>
          </div>
        )}
      </div>

      {/* Summary Stats Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-slate-900 text-white p-4 rounded-2xl border border-slate-800">
          <div className="text-[11px] font-semibold text-slate-300">Total Gambar Galeri</div>
          <div className="text-2xl font-extrabold text-cyan-400 mt-1 tabular-nums">
            {scopedImages.length}
          </div>
          <div className="text-[10px] text-slate-400 mt-1">
            Tersimpan online & tersinkronisasi
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200">
          <div className="text-[11px] font-semibold text-slate-500">Kategori Dokumentasi</div>
          <div className="text-2xl font-extrabold text-slate-900 mt-1 tabular-nums">
            {galleryCategories.length}
          </div>
          <div className="text-[10px] text-slate-500 mt-1">
            {Object.keys(categoryCounts).length} kategori terisi gambar
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200">
          <div className="text-[11px] font-semibold text-slate-500">Hasil Filter Saat Ini</div>
          <div className="text-2xl font-extrabold text-cyan-700 mt-1 tabular-nums">
            {filteredImages.length}
          </div>
          <div className="text-[10px] text-slate-500 mt-1 truncate">
            {filterCategory === 'all' ? 'Semua Kategori' : filterCategory}
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200">
          <div className="text-[11px] font-semibold text-slate-500">Dokumentasi Terbaru</div>
          <div className="text-lg font-extrabold text-slate-900 mt-1.5 font-mono">
            {latestUploadDate}
          </div>
          <div className="text-[10px] text-slate-500 mt-1">
            {canManageGallery ? 'Mode Administrator (Kelola)' : 'Mode Lihat & Detail'}
          </div>
        </div>
      </div>

      {/* Search, Filter & Category Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 space-y-3 text-xs">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-2.5">
          {/* Search Title / Description */}
          <div className="md:col-span-5 relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari judul gambar atau deskripsi..."
              className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-slate-50 border border-slate-200 focus:outline-none focus:border-cyan-500"
            />
          </div>

          {/* Category Select Filter */}
          <div className="md:col-span-3">
            <select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl bg-slate-50 border border-slate-200 font-bold text-slate-700"
            >
              <option value="all">Semua Kategori ({scopedImages.length})</option>
              {galleryCategories.map((cat) => (
                <option key={cat.id} value={cat.name}>
                  {cat.name} ({categoryCounts[cat.name] || 0})
                </option>
              ))}
            </select>
          </div>

          {/* Upload Date Filter */}
          <div className="md:col-span-2 relative">
            <input
              type="date"
              value={filterDate}
              onChange={(e) => setFilterDate(e.target.value)}
              title="Filter berdasarkan tanggal upload"
              className="w-full px-3 py-2.5 rounded-xl bg-slate-50 border border-slate-200 font-semibold text-slate-700"
            />
          </div>

          {/* Sort Order */}
          <div className="md:col-span-2">
            <select
              value={sortOrder}
              onChange={(e) => setSortOrder(e.target.value as 'newest' | 'oldest')}
              className="w-full px-3 py-2.5 rounded-xl bg-slate-50 border border-slate-200 font-bold text-slate-700"
            >
              <option value="newest">Urutkan: Terbaru</option>
              <option value="oldest">Urutkan: Terlama</option>
            </select>
          </div>
        </div>

        {/* Category Filter Chips */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
          <button
            type="button"
            onClick={() => setFilterCategory('all')}
            className={`px-3 py-1.5 rounded-lg font-bold whitespace-nowrap transition-colors cursor-pointer ${
              filterCategory === 'all'
                ? 'bg-slate-900 text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Semua ({scopedImages.length})
          </button>
          {galleryCategories.map((cat) => {
            const active = filterCategory === cat.name;
            const cnt = categoryCounts[cat.name] || 0;
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => setFilterCategory(active ? 'all' : cat.name)}
                className={`px-3 py-1.5 rounded-lg font-semibold whitespace-nowrap transition-colors cursor-pointer ${
                  active
                    ? 'bg-cyan-600 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {cat.name} ({cnt})
              </button>
            );
          })}
          {(filterDate || searchQuery || filterCategory !== 'all') && (
            <button
              type="button"
              onClick={() => {
                setSearchQuery('');
                setFilterCategory('all');
                setFilterDate('');
              }}
              className="px-3 py-1.5 rounded-lg bg-rose-50 text-rose-700 font-bold whitespace-nowrap hover:bg-rose-100 cursor-pointer"
            >
              Reset Filter
            </button>
          )}
        </div>
      </div>

      {/* Gallery Grid */}
      {displayedImages.length > 0 ? (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {displayedImages.map((img) => (
              <div
                key={img.id}
                className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-xs hover:shadow-lg transition-all flex flex-col group"
              >
                {/* Clickable Thumbnail */}
                <button
                  type="button"
                  onClick={() => openLightbox(img)}
                  className="relative h-52 w-full bg-slate-900 overflow-hidden text-left cursor-pointer"
                  title="Klik untuk memperbesar gambar"
                >
                  <img
                    src={img.imageUrl}
                    alt={img.title}
                    loading="lazy"
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950/75 via-transparent to-transparent" />
                  <div className="absolute top-3 left-3 right-3 flex items-center justify-between gap-2">
                    <span className="px-2.5 py-1 rounded-lg text-[10px] font-bold bg-slate-900/85 text-cyan-300 border border-slate-700 backdrop-blur-md truncate max-w-[75%]">
                      {img.category}
                    </span>
                    {img.status === 'Arsip' && (
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-500 text-slate-950">
                        Arsip
                      </span>
                    )}
                  </div>
                  <div className="absolute bottom-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity">
                    <span className="px-2.5 py-1 rounded-lg bg-cyan-500 text-slate-950 text-[10px] font-extrabold inline-flex items-center gap-1 shadow-md">
                      <ZoomIn className="w-3 h-3" />
                      Perbesar
                    </span>
                  </div>
                </button>

                {/* Card Content */}
                <div className="p-5 flex-1 flex flex-col justify-between space-y-3">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-[11px] text-slate-400">
                      <Calendar className="w-3.5 h-3.5 text-cyan-600" />
                      <span className="font-mono font-semibold text-slate-600">
                        {img.uploadDate || '-'}
                      </span>
                      <span>•</span>
                      <User className="w-3.5 h-3.5" />
                      <span className="truncate">{img.uploadedBy || 'Administrator'}</span>
                    </div>

                    <h3 className="font-bold text-sm text-slate-900 leading-snug line-clamp-2">
                      {img.title}
                    </h3>

                    <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed">
                      {img.description || 'Dokumentasi visual Laboratorium Komputer SMKN 15 Pandeglang.'}
                    </p>
                  </div>

                  {/* Card Footer Buttons */}
                  <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2 text-xs">
                    <button
                      type="button"
                      onClick={() => openLightbox(img)}
                      className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-cyan-50 hover:text-cyan-800 text-slate-700 font-bold inline-flex items-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <Eye className="w-3.5 h-3.5 text-cyan-600" />
                      Lihat Detail
                    </button>

                    {canManageGallery && (
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleOpenEditModal(img)}
                          className="px-2.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold inline-flex items-center gap-1 cursor-pointer"
                          title="Edit Gambar"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeleteTargetImage(img)}
                          className="px-2.5 py-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold inline-flex items-center gap-1 cursor-pointer"
                          title="Hapus Gambar"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          Hapus
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Load More / Pagination Footer */}
          <div className="bg-white px-5 py-4 rounded-2xl border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
            <div className="text-slate-600 tabular-nums">
              Menampilkan <strong>{displayedImages.length}</strong> dari{' '}
              <strong>{filteredImages.length}</strong> gambar dokumentasi
            </div>
            <div className="flex items-center gap-2">
              {hasMore && (
                <button
                  type="button"
                  onClick={() => setVisibleLimit((prev) => prev + 9)}
                  className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold inline-flex items-center gap-1.5 cursor-pointer"
                >
                  <ChevronDown className="w-4 h-4 text-cyan-400" />
                  Muat Lebih Banyak ({filteredImages.length - displayedImages.length} lagi)
                </button>
              )}
              {visibleLimit > 9 && (
                <button
                  type="button"
                  onClick={() => setVisibleLimit(9)}
                  className="px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold cursor-pointer"
                >
                  Ringkas
                </button>
              )}
            </div>
          </div>
        </>
      ) : (
        <div className="py-16 px-6 text-center bg-white rounded-3xl border border-slate-200">
          <Images className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <div className="text-sm font-bold text-slate-800">
            {scopedImages.length === 0
              ? 'Galeri Laboratorium Masih Kosong'
              : 'Tidak Ada Gambar Sesuai Filter'}
          </div>
          <div className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
            {scopedImages.length === 0
              ? 'Tambahkan foto denah ruangan, topologi jaringan LAN, tata letak PC-1 s.d. PC-20, dokumentasi perangkat, praktikum, dan UKK agar tersimpan online.'
              : 'Coba ubah kata kunci pencarian, kategori, atau filter tanggal upload.'}
          </div>
          {canManageGallery && scopedImages.length === 0 && (
            <button
              type="button"
              onClick={handleOpenAddModal}
              className="mt-4 px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs inline-flex items-center gap-1.5 cursor-pointer"
            >
              <Plus className="w-4 h-4 text-cyan-400" />
              + TAMBAH GAMBAR PERTAMA
            </button>
          )}
        </div>
      )}

      {/* ======================================================= */}
      {/* ADD / EDIT IMAGE MODAL */}
      {/* ======================================================= */}
      {isFormModalOpen && canManageGallery && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white rounded-3xl shadow-2xl max-w-2xl w-full overflow-hidden border border-slate-200 my-8">
            <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between">
              <h3 className="font-bold text-base flex items-center gap-2">
                <Images className="w-5 h-5 text-cyan-400" />
                {editingImage ? 'Edit Gambar Galeri' : 'Tambah Gambar Galeri Laboratorium'}
              </h3>
              <button
                type="button"
                disabled={isUploading}
                onClick={() => setIsFormModalOpen(false)}
                className="text-slate-400 hover:text-white p-1 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitForm} className="p-6 space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <label className="font-semibold text-slate-700 block mb-1">
                    Judul Gambar *
                  </label>
                  <input
                    type="text"
                    required
                    maxLength={200}
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Contoh: Denah Tata Letak PC-1 sampai PC-20 Lab Komputer"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 font-bold focus:outline-none focus:border-cyan-500"
                  />
                </div>

                <div>
                  <label className="font-semibold text-slate-700 block mb-1">
                    Kategori Gambar *
                  </label>
                  <select
                    required
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl bg-slate-50 border border-slate-200 font-bold text-slate-800"
                  >
                    {galleryCategories.map((c) => (
                      <option key={c.id} value={c.name}>
                        {c.name}
                      </option>
                    ))}
                    {!galleryCategories.some((c) => c.name === category) && category && (
                      <option value={category}>{category}</option>
                    )}
                  </select>
                </div>

                <div>
                  <label className="font-semibold text-slate-700 block mb-1">
                    Tanggal Dokumentasi *
                  </label>
                  <input
                    type="date"
                    required
                    value={uploadDate}
                    onChange={(e) => setUploadDate(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl bg-slate-50 border border-slate-200 font-semibold"
                  />
                </div>
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">
                  Deskripsi Gambar
                </label>
                <textarea
                  rows={3}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Jelaskan detail isi foto, lokasi perangkat, atau kegiatan yang terdokumentasi..."
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="sm:col-span-2">
                  <label className="font-semibold text-slate-700 block mb-1">
                    Keterangan Tambahan (Opsional)
                  </label>
                  <input
                    type="text"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Misal: Diambil saat persiapan UKK DKV"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 focus:outline-none focus:border-cyan-500"
                  />
                </div>

                <div>
                  <label className="font-semibold text-slate-700 block mb-1">
                    Status Tampil
                  </label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value as 'Aktif' | 'Arsip')}
                    className="w-full px-3 py-2.5 rounded-xl bg-slate-50 border border-slate-200 font-bold"
                  >
                    <option value="Aktif">Aktif (Tampil Publik)</option>
                    <option value="Arsip">Arsip (Hanya Admin)</option>
                  </select>
                </div>
              </div>

              {/* Upload File & Preview Area */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="font-semibold text-slate-700">
                    Upload File Gambar (JPG/JPEG, PNG, WEBP · Maks 10 MB) {!editingImage && '*'}
                  </label>
                  {selectedFile && (
                    <span className="text-[11px] font-mono text-cyan-700 font-bold">
                      {selectedFile.name} ({(selectedFile.size / 1024).toFixed(0)} KB)
                    </span>
                  )}
                </div>

                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp"
                  onChange={handleFileChange}
                  className="hidden"
                />

                {previewUrl ? (
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3 space-y-3">
                    <div className="relative h-56 w-full bg-slate-900 rounded-xl overflow-hidden flex items-center justify-center">
                      <img
                        src={previewUrl}
                        alt="Preview Gambar"
                        className="max-h-full max-w-full object-contain"
                      />
                    </div>
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="text-[11px] text-slate-500 flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                        {selectedFile
                          ? 'File siap diunggah ke penyimpanan online.'
                          : 'Gambar tersimpan saat ini (unggah file baru jika ingin mengganti).'}
                      </span>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          disabled={isUploading}
                          onClick={() => fileInputRef.current?.click()}
                          className="px-3 py-1.5 rounded-lg bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 font-bold inline-flex items-center gap-1 cursor-pointer"
                        >
                          <Upload className="w-3.5 h-3.5 text-cyan-600" />
                          Ganti Gambar
                        </button>
                        {selectedFile && (
                          <button
                            type="button"
                            disabled={isUploading}
                            onClick={() => clearSelectedFile(true)}
                            className="px-3 py-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold inline-flex items-center gap-1 cursor-pointer"
                          >
                            <X className="w-3.5 h-3.5" />
                            Batalkan Upload
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ) : (
                  <button
                    type="button"
                    disabled={isUploading}
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full py-10 px-4 rounded-2xl border-2 border-dashed border-slate-300 hover:border-cyan-500 bg-slate-50 hover:bg-cyan-50/40 transition-colors flex flex-col items-center justify-center gap-2 cursor-pointer"
                  >
                    <div className="w-12 h-12 rounded-2xl bg-slate-900 text-cyan-400 flex items-center justify-center">
                      <FileImage className="w-6 h-6" />
                    </div>
                    <div className="font-bold text-slate-800 text-sm">
                      Klik untuk Memilih File Gambar
                    </div>
                    <div className="text-[11px] text-slate-500">
                      Format didukung: JPG, JPEG, PNG, WEBP · Maksimal 10 MB
                    </div>
                  </button>
                )}

                {fileError && (
                  <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 flex items-center gap-2 font-semibold">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    {fileError}
                  </div>
                )}

                {/* Upload Progress Indicator */}
                {isUploading && (
                  <div className="p-3 rounded-xl bg-cyan-50 border border-cyan-200 space-y-1.5">
                    <div className="flex items-center justify-between font-bold text-cyan-900">
                      <span>Mengunggah gambar & menyimpan ke Firestore...</span>
                      <span className="tabular-nums">{uploadProgress}%</span>
                    </div>
                    <div className="w-full h-2 rounded-full bg-cyan-200 overflow-hidden">
                      <div
                        className="h-full bg-cyan-600 transition-all duration-200"
                        style={{ width: `${uploadProgress}%` }}
                      />
                    </div>
                  </div>
                )}
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  disabled={isUploading}
                  onClick={() => setIsFormModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isUploading || (!editingImage && !selectedFile)}
                  className="px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white font-bold inline-flex items-center gap-1.5 cursor-pointer"
                >
                  <CheckCircle2 className="w-4 h-4 text-cyan-400" />
                  {isUploading ? 'Menyimpan...' : 'SIMPAN'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======================================================= */}
      {/* LIGHTBOX / IMAGE VIEWER MODAL */}
      {/* ======================================================= */}
      {lightboxImage && (
        <div
          ref={lightboxContainerRef}
          className="fixed inset-0 z-50 bg-slate-950/95 backdrop-blur-sm flex flex-col"
        >
          {/* Lightbox Top Bar */}
          <div className="px-4 sm:px-6 py-3 bg-slate-900/90 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3 text-white">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded-md bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 text-[10px] font-bold">
                  {lightboxImage.category}
                </span>
                <span className="text-[11px] font-mono text-slate-400">
                  {lightboxImage.uploadDate}
                </span>
              </div>
              <h3 className="font-bold text-sm sm:text-base truncate mt-0.5">
                {lightboxImage.title}
              </h3>
            </div>

            <div className="flex flex-wrap items-center gap-1.5 text-xs">
              <button
                type="button"
                onClick={() => setZoomLevel((z) => Math.max(0.5, Number((z - 0.25).toFixed(2))))}
                className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold inline-flex items-center gap-1 cursor-pointer"
                title="Perkecil Gambar"
              >
                <ZoomOut className="w-4 h-4" />
                <span className="hidden sm:inline">Perkecil</span>
              </button>

              <button
                type="button"
                onClick={() => setZoomLevel(1)}
                className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-cyan-300 font-mono font-bold inline-flex items-center gap-1 cursor-pointer"
                title="Reset Zoom 100%"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                {Math.round(zoomLevel * 100)}%
              </button>

              <button
                type="button"
                onClick={() => setZoomLevel((z) => Math.min(3, Number((z + 0.25).toFixed(2))))}
                className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold inline-flex items-center gap-1 cursor-pointer"
                title="Perbesar Gambar"
              >
                <ZoomIn className="w-4 h-4" />
                <span className="hidden sm:inline">Perbesar</span>
              </button>

              <button
                type="button"
                onClick={toggleFullscreen}
                className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold inline-flex items-center gap-1 cursor-pointer"
                title={isFullscreen ? 'Keluar Fullscreen' : 'Tampilan Fullscreen'}
              >
                {isFullscreen ? (
                  <Minimize2 className="w-4 h-4 text-cyan-400" />
                ) : (
                  <Maximize2 className="w-4 h-4 text-cyan-400" />
                )}
                <span className="hidden sm:inline">
                  {isFullscreen ? 'Normal' : 'Fullscreen'}
                </span>
              </button>

              <button
                type="button"
                onClick={closeLightbox}
                className="px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white font-bold inline-flex items-center gap-1 cursor-pointer"
              >
                <X className="w-4 h-4" />
                <span>Tutup</span>
              </button>
            </div>
          </div>

          {/* Image Viewport */}
          <div className="flex-1 overflow-auto flex items-center justify-center p-4 sm:p-8 select-none">
            <img
              src={lightboxImage.imageUrl}
              alt={lightboxImage.title}
              style={{
                transform: `scale(${zoomLevel})`,
                transformOrigin: 'center center',
              }}
              className="max-h-[72vh] max-w-full object-contain rounded-xl shadow-2xl transition-transform duration-150"
            />
          </div>

          {/* Bottom Metadata Panel */}
          <div className="px-4 sm:px-6 py-4 bg-slate-900/95 border-t border-slate-800 text-xs text-slate-300">
            <div className="max-w-5xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-3">
              <div className="space-y-1">
                <p className="text-white font-medium leading-relaxed">
                  {lightboxImage.description || 'Tidak ada deskripsi tambahan.'}
                </p>
                {lightboxImage.notes && (
                  <p className="text-[11px] text-cyan-300">
                    Keterangan tambahan: {lightboxImage.notes}
                  </p>
                )}
              </div>
              <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-400 shrink-0">
                <span>Diunggah oleh: <strong className="text-slate-200">{lightboxImage.uploadedBy}</strong></span>
                <span className="px-2 py-0.5 rounded bg-slate-800 font-mono text-[10px]">
                  ID: {lightboxImage.imageId}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================= */}
      {/* CATEGORY MANAGEMENT MODAL (ADMIN ONLY) */}
      {/* ======================================================= */}
      {isCategoryModalOpen && canManageGallery && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white rounded-3xl shadow-2xl max-w-2xl w-full overflow-hidden border border-slate-200 my-8">
            <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between">
              <h3 className="font-bold text-base flex items-center gap-2">
                <Tag className="w-5 h-5 text-cyan-400" />
                Kelola Kategori Galeri Laboratorium
              </h3>
              <button
                type="button"
                onClick={() => setIsCategoryModalOpen(false)}
                className="text-slate-400 hover:text-white p-1 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-5 text-xs">
              {/* Add / Edit Category Form */}
              <form
                onSubmit={handleSaveCategoryForm}
                className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3"
              >
                <div className="font-bold text-slate-800">
                  {editingCategory ? `Edit Kategori: ${editingCategory.name}` : 'Tambah Kategori Baru'}
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <input
                    type="text"
                    required
                    maxLength={150}
                    value={catNameInput}
                    onChange={(e) => setCatNameInput(e.target.value)}
                    placeholder="Nama kategori..."
                    className="w-full px-3 py-2 rounded-xl bg-white border border-slate-200 font-bold"
                  />
                  <input
                    type="text"
                    value={catDescInput}
                    onChange={(e) => setCatDescInput(e.target.value)}
                    placeholder="Deskripsi singkat (opsional)..."
                    className="w-full px-3 py-2 rounded-xl bg-white border border-slate-200"
                  />
                </div>
                <div className="flex items-center justify-end gap-2">
                  {editingCategory && (
                    <button
                      type="button"
                      onClick={() => {
                        setEditingCategory(null);
                        setCatNameInput('');
                        setCatDescInput('');
                      }}
                      className="px-3 py-1.5 rounded-lg bg-white border border-slate-200 text-slate-600 font-bold cursor-pointer"
                    >
                      Batal Edit
                    </button>
                  )}
                  <button
                    type="submit"
                    className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold inline-flex items-center gap-1.5 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5 text-cyan-400" />
                    {editingCategory ? 'Simpan Perubahan' : 'Tambah Kategori'}
                  </button>
                </div>
              </form>

              {/* Category List */}
              <div className="max-h-72 overflow-y-auto divide-y divide-slate-100 border border-slate-200 rounded-2xl">
                {galleryCategories.map((cat, idx) => (
                  <div
                    key={cat.id}
                    className="px-4 py-3 flex items-center justify-between gap-3 hover:bg-slate-50"
                  >
                    <div className="min-w-0">
                      <div className="font-bold text-slate-900 truncate">
                        {idx + 1}. {cat.name}
                      </div>
                      <div className="text-[11px] text-slate-500">
                        {categoryCounts[cat.name] || 0} gambar
                        {cat.description ? ` · ${cat.description}` : ''}
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        type="button"
                        onClick={() => {
                          setEditingCategory(cat);
                          setCatNameInput(cat.name);
                          setCatDescInput(cat.description || '');
                        }}
                        className="px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold cursor-pointer"
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => setDeleteTargetCategory(cat)}
                        className="px-2.5 py-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold cursor-pointer"
                      >
                        Hapus
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Image Confirm Modal */}
      <ConfirmModal
        isOpen={!!deleteTargetImage}
        title="Hapus Gambar Galeri?"
        message="Apakah Anda yakin ingin menghapus gambar ini? Data gambar yang dihapus tidak dapat dikembalikan."
        onConfirm={async () => {
          if (deleteTargetImage) {
            try {
              await deleteGalleryImage(deleteTargetImage);
            } catch {
              // Error toast handled in AppContext
            } finally {
              setDeleteTargetImage(null);
            }
          }
        }}
        onCancel={() => setDeleteTargetImage(null)}
      />

      {/* Delete Category Confirm Modal */}
      <ConfirmModal
        isOpen={!!deleteTargetCategory}
        title="Hapus Kategori Galeri?"
        message={`Apakah Anda yakin ingin menghapus kategori "${deleteTargetCategory?.name || ''}"? Gambar yang sudah ada tidak akan ikut terhapus.`}
        onConfirm={async () => {
          if (deleteTargetCategory) {
            try {
              await deleteGalleryCategory(deleteTargetCategory.id);
            } catch {
              // Error toast handled in AppContext
            } finally {
              setDeleteTargetCategory(null);
            }
          }
        }}
        onCancel={() => setDeleteTargetCategory(null)}
      />
    </div>
  );
};
