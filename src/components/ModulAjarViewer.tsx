import React, { useMemo, useRef, useState, useEffect } from 'react';
import {
  FileDown,
  Printer,
  Copy,
  Check,
  ArrowLeft,
  Sparkles,
  RefreshCw,
  Share2,
  Save,
  Clock,
  AlertTriangle,
  CheckCircle2,
  Layers,
  BookOpen,
  ClipboardCheck,
  ExternalLink,
  Plus,
  Pencil,
  Trash2,
} from 'lucide-react';
import type {
  CooperativeTechniqueVariant,
  JenisAksesMateriReferensi,
  JenisReferensiSumber,
  KegiatanPembelajaranLangkah,
  LKPDPresetType,
  ModulAjarDokumen,
  ModulReferensiSumberItem,
  TahapKegiatanTerstruktur,
} from '../types/perangkatAjar';
import type { SchoolProfile, CustomTPItem } from '../utils/schoolProfileStorage';
import { getSchoolProfile } from '../utils/schoolProfileStorage';
import { exportModulAjarToDocx } from '../utils/docxExporter';
import {
  SIBI_CATALOG_URL,
  PROVENANCE_MSG_UNLINKED,
  JENIS_REFERENSI_LABELS,
  JENIS_AKSES_MATERI_LABELS,
  buildReferensiBahanBacaanNote,
  formatReferensiSumberCitation,
  getReferensiStatusLabel,
  normalizeReferensiSumberInput,
} from '../utils/modulReferensiSumber';
import {
  generateContextualModulAjarWithAI,
  MODUL_AJAR_MODELS,
  COOPERATIVE_TECHNIQUE_VARIANTS,
  getModulAjarModelDefinition,
  isValidModulAjarModelType,
  type ModulAjarModelType,
} from '../utils/modulAjarAiService';
import { isLegacyModulAjarModelId } from '../utils/modulPedagogicalModels';
import {
  computeMeetingsNeededForTP,
  formatAlokasiWaktuLabel,
  reconcileSessionStageDurations,
  resolveModulTimePreset,
  syncLegacyArraysFromStructuredStages,
  validateModulTimeBudget,
  validateSessionTimeBudget,
} from '../utils/modulTimeBudget';
import { resolveModulKKTPConfig } from '../utils/modulOperationalContent';
import {
  CURATED_EXAMPLE_NON_OFFICIAL_DISCLAIMER,
  cloneCuratedExampleAsTeacherDraft,
  getCuratedModulExamples,
  type CuratedModulExample,
} from '../utils/modulCuratedExamples';
import { buildSmartModulAjar } from '../utils/perangkatAjarEngine';
import {
  fetchSharedCurriculum,
  publishSharedCurriculum,
  hydrateSharedDocWithLocalProfile,
} from '../utils/sharedCurriculumService';
import {
  loadLatestLKPDDraft,
  loadModulAjarDraft,
  saveModulAjarDraft,
} from '../utils/perangkatDraftStorage';
import { buildAcademicContextKey } from './modulAjarHelpers';
import { requireActiveLicenseForAction } from '../utils/licenseManager';

interface ModulAjarViewerProps {
  modul: ModulAjarDokumen;
  schoolProfile?: SchoolProfile;
  customTP?: CustomTPItem | null;
  onPrint: () => void;
  onBackToClassHub: () => void;
  onDraftSaved?: (doc: ModulAjarDokumen) => void;
  onOpenLKPDStudio?: (
    tp: CustomTPItem,
    options?: { preset?: LKPDPresetType; konteks?: string }
  ) => void;
}

interface AutoExpandingTextareaProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  value: string;
}

const AutoExpandingTextarea: React.FC<AutoExpandingTextareaProps> = ({
  value,
  onChange,
  style,
  rows = 1,
  className = 'lkpd-inline-textarea',
  ...props
}) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const adjustHeight = () => {
    const el = textareaRef.current;
    if (el) {
      el.style.height = 'auto';
      el.style.height = `${el.scrollHeight}px`;
    }
  };

  useEffect(() => {
    adjustHeight();
    if (typeof window === 'undefined') return;
    window.addEventListener('resize', adjustHeight);
    return () => window.removeEventListener('resize', adjustHeight);
  }, [value]);

  return (
    <textarea
      ref={textareaRef}
      rows={rows}
      value={value}
      onChange={(e) => {
        adjustHeight();
        onChange?.(e);
      }}
      className={className}
      style={{
        width: '100%',
        overflow: 'hidden',
        resize: 'none',
        display: 'block',
        ...style,
      }}
      {...props}
    />
  );
};

export const ModulAjarViewer: React.FC<ModulAjarViewerProps> = ({
  modul,
  schoolProfile,
  customTP,
  onPrint,
  onBackToClassHub,
  onDraftSaved,
  onOpenLKPDStudio,
}) => {
  const activeProfile = schoolProfile || getSchoolProfile();
  const [copied, setCopied] = useState(false);
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const sheetRef = useRef<HTMLDivElement>(null);

  const initialPreset = resolveModulTimePreset(activeProfile);
  const initialModel: ModulAjarModelType = isValidModulAjarModelType(modul.modelType)
    ? modul.modelType
    : 'pbl';

  const [editableDoc, setEditableDoc] = useState<ModulAjarDokumen>(() => {
    const fallbackJP =
      modul.alokasiWaktuDetail?.totalAlokasiJPTP || initialPreset.jpPerPertemuan;
    const initialTP: CustomTPItem = customTP || {
      id: modul.tpId || `tp-${modul.tpKode}`,
      kode: modul.tpKode,
      elemen: modul.elemen || '',
      materiPokok: modul.materiPokok || '',
      tujuanPembelajaran: modul.tujuanPembelajaran || '',
      arahanRangkuman: '',
      alokasiJP: fallbackJP,
      mingguMulai: 1,
      mingguSelesai: 1,
    };
    const lookupVariant = isLegacyModulAjarModelId(modul.modelType)
      ? modul.modelType
      : isValidModulAjarModelType(modul.modelType)
      ? modul.modelType
      : initialModel;
    const restored = loadModulAjarDraft(activeProfile, initialTP, lookupVariant);
    return restored || modul;
  });

  const [selectedModel, setSelectedModel] = useState<ModulAjarModelType>(() =>
    isValidModulAjarModelType(editableDoc.modelType) ? editableDoc.modelType : initialModel
  );
  const [cooperativeVariant, setCooperativeVariant] = useState<CooperativeTechniqueVariant>(() =>
    COOPERATIVE_TECHNIQUE_VARIANTS.includes(editableDoc.variasiTeknikModel as CooperativeTechniqueVariant)
      ? (editableDoc.variasiTeknikModel as CooperativeTechniqueVariant)
      : 'Think-Pair-Share'
  );
  const [smkTrackOverride, setSmkTrackOverride] = useState<'umum' | 'kejuruan' | undefined>(() =>
    editableDoc.alokasiWaktuDetail?.smkTrack === 'umum' ||
    editableDoc.alokasiWaktuDetail?.smkTrack === 'kejuruan'
      ? editableDoc.alokasiWaktuDetail.smkTrack
      : undefined
  );
  const [jpPerPertemuan, setJpPerPertemuan] = useState<number>(
    () => editableDoc.alokasiWaktuDetail?.jpPerPertemuan || initialPreset.jpPerPertemuan
  );
  const [menitPerJP, setMenitPerJP] = useState<number>(
    () => editableDoc.alokasiWaktuDetail?.menitPerJP || initialPreset.menitPerJP
  );
  const [jumlahPertemuan, setJumlahPertemuan] = useState<number>(
    () =>
      editableDoc.alokasiWaktuDetail?.jumlahPertemuan ||
      editableDoc.jumlahPertemuan ||
      editableDoc.kegiatanPembelajaran?.length ||
      1
  );
  const [pendingModelSwitch, setPendingModelSwitch] = useState<{
    targetModel: ModulAjarModelType;
  } | null>(null);
  const [aiFailureNotice, setAiFailureNotice] = useState<{
    message: string;
    issues?: string[];
    fallbackDoc: ModulAjarDokumen;
    repairAttempted?: boolean;
    quotaError?: boolean;
  } | null>(null);
  const [konteksInput, setKonteksInput] = useState<string>('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [isFromCommunity, setIsFromCommunity] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'Tersimpan' | 'Menyimpan...' | 'Gagal menyimpan'>('Tersimpan');

  const [showRefForm, setShowRefForm] = useState(false);
  const [showExamplesPanel, setShowExamplesPanel] = useState(false);
  const [previewingExample, setPreviewingExample] = useState<CuratedModulExample | null>(null);
  const [confirmUseExample, setConfirmUseExample] = useState(false);
  const [editingRefId, setEditingRefId] = useState<string | null>(null);
  const [refFormError, setRefFormError] = useState<string | null>(null);
  const [refFormWarning, setRefFormWarning] = useState<string | null>(null);
  const [refForm, setRefForm] = useState<{
    jenisSumber: JenisReferensiSumber;
    judulBuku: string;
    jenjang: string;
    kelas: string;
    mataPelajaran: string;
    penulis: string;
    edisiAtauTahun: string;
    babAtauSubbab: string;
    halaman: string;
    urlSumber: string;
    catatanMateriGuru: string;
    jenisAksesMateri: JenisAksesMateriReferensi;
  }>({
    jenisSumber: 'sibi_kemendikdasmen',
    judulBuku: '',
    jenjang: activeProfile.jenjang || modul.jenjangFase || '',
    kelas: modul.kelas || activeProfile.kelasUtama || '',
    mataPelajaran: modul.mataPelajaran || activeProfile.mataPelajaranUtama || '',
    penulis: '',
    edisiAtauTahun: '',
    babAtauSubbab: '',
    halaman: '',
    urlSumber: '',
    catatanMateriGuru: '',
    jenisAksesMateri: 'catatan_ringkas_guru',
  });

  const resolvedTimePreset = useMemo(
    () =>
      resolveModulTimePreset(activeProfile, {
        jpPerPertemuan,
        menitPerJP,
        smkTrackOverride,
      }),
    [activeProfile, jpPerPertemuan, menitPerJP, smkTrackOverride]
  );
  const curatedExamples = useMemo(() => getCuratedModulExamples(), []);
  const isExamplePreview = previewingExample !== null;
  const displayDoc = previewingExample ? previewingExample.modul : editableDoc;
  const sheetProfile = previewingExample ? previewingExample.sampleProfile : activeProfile;

  const effectiveTP: CustomTPItem = customTP || {
    id: editableDoc.tpId || modul.tpId || `tp-${modul.tpKode}`,
    kode: modul.tpKode,
    elemen: modul.elemen || '',
    materiPokok: modul.materiPokok || '',
    tujuanPembelajaran: modul.tujuanPembelajaran || '',
    arahanRangkuman: '',
    alokasiJP:
      editableDoc.alokasiWaktuDetail?.totalAlokasiJPTP ||
      modul.alokasiWaktuDetail?.totalAlokasiJPTP ||
      resolvedTimePreset.jpPerPertemuan,
    mingguMulai: 1,
    mingguSelesai: 1,
  };

  const totalAlokasiJPTP = Math.max(
    1,
    Number(effectiveTP.alokasiJP) || resolvedTimePreset.jpPerPertemuan
  );
  const activeMeetingPlan = useMemo(
    () =>
      computeMeetingsNeededForTP(
        totalAlokasiJPTP,
        jpPerPertemuan,
        menitPerJP,
        jumlahPertemuan
      ),
    [totalAlokasiJPTP, jpPerPertemuan, menitPerJP, jumlahPertemuan]
  );
  const selectedModelDef = useMemo(
    () => getModulAjarModelDefinition(selectedModel),
    [selectedModel]
  );
  const timeValidation = useMemo(
    () => validateModulTimeBudget(editableDoc, activeProfile),
    [editableDoc, activeProfile]
  );
  const kktpDisplay = useMemo(
    () =>
      resolveModulKKTPConfig(
        previewingExample ? previewingExample.tp : effectiveTP,
        previewingExample ? previewingExample.sampleProfile : activeProfile
      ),
    [previewingExample, effectiveTP, activeProfile]
  );
  const linkedLKPDStudioDraft = useMemo(
    () => loadLatestLKPDDraft(activeProfile, effectiveTP),
    [activeProfile, effectiveTP]
  );
  const isLegacyDifferentiatedDraft = isLegacyModulAjarModelId(editableDoc.modelType);

  const tpId = effectiveTP.id;
  const tpKode = effectiveTP.kode || modul.tpKode;
  const jenjang = activeProfile.jenjang || modul.jenjangFase || 'SD/MI';
  const kelas = modul.kelas || activeProfile.kelasUtama || '4';
  const mapel = modul.mataPelajaran || activeProfile.mataPelajaranUtama || 'Umum';
  const materiPokok = effectiveTP.materiPokok || modul.materiPokok || 'Umum';
  const academicContextKey = buildAcademicContextKey(activeProfile);

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 2600);
  };

  const syncTimeStatesFromDoc = (doc: ModulAjarDokumen) => {
    const preset = resolveModulTimePreset(activeProfile);
    if (doc.alokasiWaktuDetail) {
      setJpPerPertemuan(doc.alokasiWaktuDetail.jpPerPertemuan || preset.jpPerPertemuan);
      setMenitPerJP(doc.alokasiWaktuDetail.menitPerJP || preset.menitPerJP);
      setJumlahPertemuan(
        doc.alokasiWaktuDetail.jumlahPertemuan ||
          doc.jumlahPertemuan ||
          doc.kegiatanPembelajaran?.length ||
          1
      );
      if (
        doc.alokasiWaktuDetail.smkTrack === 'umum' ||
        doc.alokasiWaktuDetail.smkTrack === 'kejuruan'
      ) {
        setSmkTrackOverride(doc.alokasiWaktuDetail.smkTrack);
      }
    } else {
      setJpPerPertemuan(preset.jpPerPertemuan);
      setMenitPerJP(preset.menitPerJP);
      setJumlahPertemuan(
        doc.jumlahPertemuan || doc.kegiatanPembelajaran?.length || 1
      );
    }
    if (
      doc.variasiTeknikModel &&
      COOPERATIVE_TECHNIQUE_VARIANTS.includes(
        doc.variasiTeknikModel as CooperativeTechniqueVariant
      )
    ) {
      setCooperativeVariant(doc.variasiTeknikModel as CooperativeTechniqueVariant);
    }
  };

  const pendingFlushRef = useRef<{
    dirty: boolean;
    doc: ModulAjarDokumen;
    profile: SchoolProfile;
    tp: CustomTPItem;
    model: string;
  }>({
    dirty: false,
    doc: editableDoc,
    profile: activeProfile,
    tp: effectiveTP,
    model: isLegacyModulAjarModelId(editableDoc.modelType)
      ? editableDoc.modelType!
      : selectedModel,
  });

  const lastSyncedDocRef = useRef<{ tpKey: string; savedAt?: string; id?: string }>({
    tpKey: `${tpId}|${tpKode}|${academicContextKey}`,
    savedAt: editableDoc.savedAt,
    id: editableDoc.id,
  });

  const flushModulSaveNow = (
    overrideDoc?: ModulAjarDokumen,
    overrideSource?: 'user_edited' | 'ai_generated' | 'template'
  ) => {
    const payload = pendingFlushRef.current;
    const docToSave = overrideDoc || payload.doc;
    if (!overrideDoc && !payload.dirty) return;
    const targetVariant = isLegacyModulAjarModelId(docToSave.modelType)
      ? docToSave.modelType!
      : docToSave.modelType || payload.model;
    const res = saveModulAjarDraft(
      payload.profile,
      payload.tp,
      targetVariant,
      docToSave,
      overrideSource || docToSave.draftSource || 'user_edited'
    );
    pendingFlushRef.current.dirty = false;
    pendingFlushRef.current.doc = res.doc;
    lastSyncedDocRef.current = {
      tpKey: `${tpId}|${tpKode}|${academicContextKey}`,
      savedAt: res.doc.savedAt,
      id: res.doc.id,
    };
    if (res.ok) {
      setSaveStatus('Tersimpan');
      onDraftSaved?.(res.doc);
    } else {
      setSaveStatus('Gagal menyimpan');
    }
  };

  const saveToLocalStorage = (
    doc: ModulAjarDokumen,
    source: 'user_edited' | 'ai_generated' | 'template' = 'user_edited',
    explicitModel?: string
  ) => {
    setSaveStatus('Menyimpan...');
    const normalizedDoc =
      doc.draftSource === source ? doc : { ...doc, draftSource: source };
    if (source === 'user_edited' && doc.draftSource !== 'user_edited') {
      setEditableDoc(normalizedDoc);
    }
    const variantKey =
      explicitModel ||
      (isLegacyModulAjarModelId(normalizedDoc.modelType)
        ? normalizedDoc.modelType!
        : normalizedDoc.modelType || selectedModel);
    pendingFlushRef.current = {
      dirty: true,
      doc: normalizedDoc,
      profile: activeProfile,
      tp: effectiveTP,
      model: variantKey,
    };
    flushModulSaveNow(normalizedDoc, source);
  };

  useEffect(() => {
    const handleFlushOnExit = () => {
      flushModulSaveNow();
    };
    const handleVisibility = () => {
      if (typeof document !== 'undefined' && document.visibilityState === 'hidden') {
        flushModulSaveNow();
      }
    };
    if (typeof window !== 'undefined') {
      window.addEventListener('pagehide', handleFlushOnExit);
      window.addEventListener('beforeunload', handleFlushOnExit);
    }
    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', handleVisibility);
    }
    return () => {
      flushModulSaveNow();
      if (typeof window !== 'undefined') {
        window.removeEventListener('pagehide', handleFlushOnExit);
        window.removeEventListener('beforeunload', handleFlushOnExit);
      }
      if (typeof document !== 'undefined') {
        document.removeEventListener('visibilitychange', handleVisibility);
      }
    };
  }, []);

  // Muat draf tersimpan / referensi bank saat TP atau konteks akademik berubah
  useEffect(() => {
    const nextTpKey = `${tpId}|${tpKode}|${academicContextKey}`;
    if (
      lastSyncedDocRef.current.tpKey === nextTpKey &&
      modul.savedAt &&
      lastSyncedDocRef.current.savedAt === modul.savedAt &&
      lastSyncedDocRef.current.id === modul.id
    ) {
      return;
    }

    let isMounted = true;
    setPendingModelSwitch(null);
    setPreviewingExample(null);
    setConfirmUseExample(false);
    setShowRefForm(false);
    setEditingRefId(null);
    setRefFormError(null);
    setRefFormWarning(null);

    const lookupModel = isLegacyModulAjarModelId(modul.modelType)
      ? modul.modelType
      : isValidModulAjarModelType(modul.modelType)
      ? modul.modelType
      : 'pbl';

    const hydrateInitial = async () => {
      try {
        const localDraft = loadModulAjarDraft(activeProfile, effectiveTP, lookupModel);
        if (localDraft) {
          if (!isMounted) return;
          setEditableDoc(localDraft);
          if (isValidModulAjarModelType(localDraft.modelType)) {
            setSelectedModel(localDraft.modelType);
          }
          syncTimeStatesFromDoc(localDraft);
          pendingFlushRef.current = {
            dirty: false,
            doc: localDraft,
            profile: activeProfile,
            tp: effectiveTP,
            model: localDraft.modelType || lookupModel,
          };
          setSaveStatus('Tersimpan');
          setIsFromCommunity(false);
          return;
        }

        // Gunakan modul awal (atau bangun ulang sadar-jenjang bila konteks profil berubah)
        setEditableDoc(modul);
        if (isValidModulAjarModelType(modul.modelType)) {
          setSelectedModel(modul.modelType);
        }
        syncTimeStatesFromDoc(modul);
        pendingFlushRef.current = {
          dirty: false,
          doc: modul,
          profile: activeProfile,
          tp: effectiveTP,
          model: modul.modelType || lookupModel,
        };
        setIsFromCommunity(false);

        if (!isLegacyModulAjarModelId(modul.modelType) && modul.draftSource === 'template') {
          const res = await fetchSharedCurriculum<ModulAjarDokumen>({
            type: 'modul_ajar',
            jenjang,
            kelas,
            mapel,
            tpKode,
            materiPokok,
            model: lookupModel,
          });
          if (!isMounted) return;
          if (res.found && res.data) {
            const hydrated = hydrateSharedDocWithLocalProfile(res.data, activeProfile);
            setEditableDoc(hydrated);
            syncTimeStatesFromDoc(hydrated);
            pendingFlushRef.current.doc = hydrated;
            setIsFromCommunity(true);
            showToast('Draf referensi guru komunitas berhasil dimuat!');
          }
        }
      } catch {
        if (!isMounted) return;
        setEditableDoc(modul);
        syncTimeStatesFromDoc(modul);
        setIsFromCommunity(false);
      }
    };

    hydrateInitial();

    return () => {
      isMounted = false;
    };
  }, [tpId, tpKode, academicContextKey, modul]);

  const applyModelSyntaxSwitch = (
    targetModel: ModulAjarModelType,
    overrideVariant?: CooperativeTechniqueVariant
  ) => {
    const nextVariant = overrideVariant || cooperativeVariant;
    const regenerated = buildSmartModulAjar(effectiveTP, activeProfile, {
      model: targetModel,
      jpPerPertemuan,
      menitPerJP,
      jumlahPertemuan,
      smkTrackOverride,
      variasiTeknikModel: nextVariant,
      konteksLokal: konteksInput.trim() || undefined,
      referensiSumber: editableDoc.referensiSumber,
    });
    setSelectedModel(targetModel);
    if (overrideVariant) {
      setCooperativeVariant(overrideVariant);
    }
    setPendingModelSwitch(null);
    setIsFromCommunity(false);
    setEditableDoc(regenerated);
    saveToLocalStorage(regenerated, 'template', targetModel);
    const targetDef = getModulAjarModelDefinition(targetModel);
    showToast(`Sintaks modul diperbarui ke ${targetDef.label}.`);
  };

  const handleModelSelectChange = (targetModel: ModulAjarModelType) => {
    flushModulSaveNow();
    if (targetModel === selectedModel && !isLegacyDifferentiatedDraft) {
      return;
    }

    const savedForTarget = loadModulAjarDraft(activeProfile, effectiveTP, targetModel);
    if (savedForTarget) {
      setPendingModelSwitch(null);
      setSelectedModel(targetModel);
      setEditableDoc(savedForTarget);
      syncTimeStatesFromDoc(savedForTarget);
      pendingFlushRef.current = {
        dirty: false,
        doc: savedForTarget,
        profile: activeProfile,
        tp: effectiveTP,
        model: targetModel,
      };
      setIsFromCommunity(false);
      showToast(`Draf tersimpan model ${getModulAjarModelDefinition(targetModel).namaSingkat} dimuat.`);
      return;
    }

    if (editableDoc.draftSource === 'user_edited' || isLegacyDifferentiatedDraft) {
      setPendingModelSwitch({ targetModel });
      return;
    }

    applyModelSyntaxSwitch(targetModel);
  };

  const applyTimeConfigChange = (params: {
    nextJP?: number;
    nextMenit?: number;
    nextMeetings?: number;
    nextSmkTrack?: 'umum' | 'kejuruan';
  }) => {
    const targetSmkTrack =
      params.nextSmkTrack !== undefined ? params.nextSmkTrack : smkTrackOverride;
    const effectivePreset = resolveModulTimePreset(activeProfile, {
      smkTrackOverride: targetSmkTrack,
    });

    const targetJP =
      params.nextJP !== undefined
        ? Math.max(1, Math.min(12, Math.round(params.nextJP)))
        : params.nextSmkTrack !== undefined
        ? effectivePreset.jpPerPertemuan
        : jpPerPertemuan;
    const targetMenit =
      params.nextMenit !== undefined
        ? Math.max(20, Math.min(90, Math.round(params.nextMenit)))
        : menitPerJP;
    const tempPlan = computeMeetingsNeededForTP(
      totalAlokasiJPTP,
      targetJP,
      targetMenit,
      params.nextMeetings
    );
    const targetMeetings =
      params.nextMeetings !== undefined
        ? Math.max(1, Math.min(12, Math.round(params.nextMeetings)))
        : params.nextSmkTrack !== undefined || params.nextJP !== undefined
        ? tempPlan.jumlahPertemuanDisarankan
        : jumlahPertemuan;

    const finalPlan = computeMeetingsNeededForTP(
      totalAlokasiJPTP,
      targetJP,
      targetMenit,
      targetMeetings
    );

    if (params.nextSmkTrack !== undefined) setSmkTrackOverride(params.nextSmkTrack);
    setJpPerPertemuan(finalPlan.jpPerPertemuan);
    setMenitPerJP(finalPlan.menitPerJP);
    setJumlahPertemuan(finalPlan.jumlahPertemuanAktif);

    const activeVariant = isLegacyModulAjarModelId(editableDoc.modelType)
      ? editableDoc.modelType!
      : selectedModel;

    // Bila masih template & tidak legacy, regenerasikan modul penuh sesuai waktu baru
    if (editableDoc.draftSource === 'template' && !isLegacyDifferentiatedDraft) {
      const rebuilt = buildSmartModulAjar(effectiveTP, activeProfile, {
        model: selectedModel,
        jpPerPertemuan: finalPlan.jpPerPertemuan,
        menitPerJP: finalPlan.menitPerJP,
        jumlahPertemuan: finalPlan.jumlahPertemuanAktif,
        smkTrackOverride: targetSmkTrack,
        variasiTeknikModel: cooperativeVariant,
        konteksLokal: konteksInput.trim() || undefined,
        referensiSumber: editableDoc.referensiSumber,
      });
      setEditableDoc(rebuilt);
      saveToLocalStorage(rebuilt, 'template', selectedModel);
      showToast(`Alokasi waktu disesuaikan: ${finalPlan.jpPerPertemuan} JP × ${finalPlan.menitPerJP} mnt = ${finalPlan.totalMenitPertemuan} mnt/pertemuan.`);
      return;
    }

    // Pertahankan suntingan guru / AI / legacy sambil menyesuaikan durasi agar tepat invariant
    const fallbackPool = buildSmartModulAjar(effectiveTP, activeProfile, {
      model: selectedModel,
      jpPerPertemuan: finalPlan.jpPerPertemuan,
      menitPerJP: finalPlan.menitPerJP,
      jumlahPertemuan: finalPlan.jumlahPertemuanAktif,
      smkTrackOverride: targetSmkTrack,
      variasiTeknikModel: cooperativeVariant,
      konteksLokal: konteksInput.trim() || undefined,
      referensiSumber: editableDoc.referensiSumber,
    });

    const nextKegiatan: KegiatanPembelajaranLangkah[] = Array.from(
      { length: finalPlan.jumlahPertemuanAktif },
      (_, idx) => {
        const existingKeg = editableDoc.kegiatanPembelajaran?.[idx];
        const fallbackKeg =
          fallbackPool.kegiatanPembelajaran[idx] || fallbackPool.kegiatanPembelajaran[0];
        if (!existingKeg) {
          return {
            ...fallbackKeg,
            pertemuan: idx + 1,
          };
        }
        if (
          Array.isArray(existingKeg.tahapTerstruktur) &&
          existingKeg.tahapTerstruktur.length > 0
        ) {
          const reconciled = reconcileSessionStageDurations(
            existingKeg.tahapTerstruktur,
            finalPlan.totalMenitPertemuan
          );
          const syncedLegacy = syncLegacyArraysFromStructuredStages(reconciled);
          return {
            ...existingKeg,
            pertemuan: idx + 1,
            jpPertemuan: finalPlan.jpPerPertemuan,
            alokasiMenit: finalPlan.totalMenitPertemuan,
            ...syncedLegacy,
            tahapTerstruktur: reconciled,
          };
        }
        return {
          ...existingKeg,
          pertemuan: idx + 1,
          jpPertemuan: finalPlan.jpPerPertemuan,
          alokasiMenit: finalPlan.totalMenitPertemuan,
        };
      }
    );

    const updatedDoc: ModulAjarDokumen = {
      ...editableDoc,
      alokasiWaktu: formatAlokasiWaktuLabel(finalPlan),
      jumlahPertemuan: finalPlan.jumlahPertemuanAktif,
      alokasiWaktuDetail: {
        jenjangKategori: effectivePreset.jenjangKategori,
        ...(effectivePreset.smkTrack ? { smkTrack: effectivePreset.smkTrack } : {}),
        jpPerPertemuan: finalPlan.jpPerPertemuan,
        menitPerJP: finalPlan.menitPerJP,
        totalMenitPertemuan: finalPlan.totalMenitPertemuan,
        jumlahPertemuan: finalPlan.jumlahPertemuanAktif,
        totalAlokasiJPTP: finalPlan.totalAlokasiJPTP,
        sumberPreset: 'override_guru',
      },
      kegiatanPembelajaran: nextKegiatan,
    };

    setEditableDoc(updatedDoc);
    saveToLocalStorage(
      updatedDoc,
      updatedDoc.draftSource === 'ai_generated'
        ? 'ai_generated'
        : updatedDoc.draftSource === 'user_edited'
        ? 'user_edited'
        : 'template',
      activeVariant
    );
    showToast(`Alokasi waktu disesuaikan: ${finalPlan.totalMenitPertemuan} mnt/pertemuan.`);
  };

  const handleAutoReconcileDurations = () => {
    const targetMenit = activeMeetingPlan.totalMenitPertemuan;
    const nextKegiatan = (editableDoc.kegiatanPembelajaran || []).map((keg) => {
      if (Array.isArray(keg.tahapTerstruktur) && keg.tahapTerstruktur.length > 0) {
        const reconciled = reconcileSessionStageDurations(keg.tahapTerstruktur, targetMenit);
        const syncedLegacy = syncLegacyArraysFromStructuredStages(reconciled);
        return {
          ...keg,
          jpPertemuan: activeMeetingPlan.jpPerPertemuan,
          alokasiMenit: targetMenit,
          ...syncedLegacy,
          tahapTerstruktur: reconciled,
        };
      }
      return {
        ...keg,
        jpPertemuan: activeMeetingPlan.jpPerPertemuan,
        alokasiMenit: targetMenit,
      };
    });
    const updatedDoc: ModulAjarDokumen = {
      ...editableDoc,
      alokasiWaktu: formatAlokasiWaktuLabel(activeMeetingPlan),
      kegiatanPembelajaran: nextKegiatan,
    };
    setEditableDoc(updatedDoc);
    saveToLocalStorage(updatedDoc, updatedDoc.draftSource === 'ai_generated' ? 'ai_generated' : 'user_edited');
    showToast(`Durasi tiap tahap disesuaikan tepat menjadi ${targetMenit} menit per pertemuan.`);
  };

  const handleGenerateAI = async () => {
    if (!requireActiveLicenseForAction('membuat draf Modul Ajar AI')) {
      return;
    }
    setIsGenerating(true);
    try {
      const result = await generateContextualModulAjarWithAI(
        effectiveTP,
        activeProfile,
        selectedModel,
        konteksInput.trim() || undefined,
        {
          jpPerPertemuan,
          menitPerJP,
          jumlahPertemuan,
          smkTrackOverride,
          variasiTeknikModel: selectedModel === 'cooperative' ? cooperativeVariant : undefined,
          referensiSumber: editableDoc.referensiSumber,
        }
      );

      if (result.usedFallback) {
        // Pertahankan draf existing agar suntingan guru tidak tertimpa saat AI gagal/ditolak validator
        setAiFailureNotice({
          message:
            result.errorMsg ||
            'Layanan AI belum menghasilkan modul ajar yang memenuhi kriteria operasional.',
          issues: result.validationErrors,
          fallbackDoc: result.modul,
          repairAttempted: result.repairAttempted,
          quotaError: result.quotaError,
        });
        showToast('AI gagal/ditolak — draf yang sedang dibuka tetap dipertahankan.');
        return;
      }

      setAiFailureNotice(null);
      const nextDoc: ModulAjarDokumen = {
        ...result.modul,
        tpId: effectiveTP.id,
        modelType: selectedModel,
        draftSource: 'ai_generated',
        ...(editableDoc.referensiSumber?.length
          ? { referensiSumber: editableDoc.referensiSumber }
          : {}),
      };
      setEditableDoc(nextDoc);
      syncTimeStatesFromDoc(nextDoc);
      saveToLocalStorage(nextDoc, 'ai_generated', selectedModel);
      setIsFromCommunity(false);
      showToast(
        result.repairAttempted
          ? '✨ Modul Ajar AI berhasil disusun & lolos validasi setelah 1x perbaikan!'
          : '✨ Modul Ajar AI berhasil disusun & lolos validasi kualitas!'
      );
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Terjadi kesalahan';
      alert('Gagal membuat modul ajar: ' + msg);
    } finally {
      setIsGenerating(false);
    }
  };

  const applyReferensiListToDoc = (nextRefs: ModulReferensiSumberItem[]) => {
    const cleanNext = nextRefs.length > 0 ? nextRefs : undefined;
    const prevTitles = new Set(
      (editableDoc.referensiSumber || []).map((r) => r.judulBuku.toLowerCase())
    );
    const nonLinkedPustaka = (editableDoc.daftarPustaka || []).filter((entry) => {
      if (cleanNext && /^\s*\[Lengkapi referensi satuan pendidikan\]/i.test(entry)) {
        return false;
      }
      const lowerEntry = entry.toLowerCase();
      return !Array.from(prevTitles).some((title) => title && lowerEntry.includes(title));
    });
    const nextDaftarPustaka = cleanNext
      ? Array.from(new Set([...cleanNext.map(formatReferensiSumberCitation), ...nonLinkedPustaka]))
      : nonLinkedPustaka.length > 0
      ? nonLinkedPustaka
      : [
          `[Lengkapi referensi satuan pendidikan] Buku teks/panduan resmi ${mapel} Kelas ${kelas} yang digunakan sekolah.`,
          'Badan Standar, Kurikulum, dan Asesmen Pendidikan (BSKAP). Panduan Pembelajaran dan Asesmen (PPA) Kurikulum Merdeka.',
        ];
    const nextNote =
      buildReferensiBahanBacaanNote(cleanNext) ||
      'Lengkapi/sesuaikan rujukan bacaan dengan buku teks utama satuan pendidikan.';
    const updatedDoc: ModulAjarDokumen = {
      ...editableDoc,
      ...(cleanNext ? { referensiSumber: cleanNext } : { referensiSumber: undefined }),
      daftarPustaka: nextDaftarPustaka,
      ...(editableDoc.bahanBacaan
        ? {
            bahanBacaan: {
              ...editableDoc.bahanBacaan,
              referensiCatatan: nextNote,
            },
          }
        : {}),
    };
    setEditableDoc(updatedDoc);
    saveToLocalStorage(updatedDoc, 'user_edited');
  };

  const openNewRefForm = () => {
    setEditingRefId(null);
    setRefFormError(null);
    setRefFormWarning(null);
    setRefForm({
      jenisSumber: 'sibi_kemendikdasmen',
      judulBuku: '',
      jenjang,
      kelas,
      mataPelajaran: mapel,
      penulis: '',
      edisiAtauTahun: '',
      babAtauSubbab: '',
      halaman: '',
      urlSumber: '',
      catatanMateriGuru: '',
      jenisAksesMateri: 'catatan_ringkas_guru',
    });
    setShowRefForm(true);
  };

  const openEditRefForm = (item: ModulReferensiSumberItem) => {
    setEditingRefId(item.id);
    setRefFormError(null);
    setRefFormWarning(null);
    setRefForm({
      jenisSumber: item.jenisSumber || 'sibi_kemendikdasmen',
      judulBuku: item.judulBuku || '',
      jenjang: item.jenjang || jenjang,
      kelas: item.kelas || kelas,
      mataPelajaran: item.mataPelajaran || mapel,
      penulis: item.penulis || '',
      edisiAtauTahun: item.edisiAtauTahun || '',
      babAtauSubbab: item.babAtauSubbab || '',
      halaman: item.halaman || '',
      urlSumber: item.urlSumber || '',
      catatanMateriGuru: item.catatanMateriGuru || '',
      jenisAksesMateri:
        item.jenisAksesMateri === 'teks_disediakan_guru'
          ? 'teks_disediakan_guru'
          : 'catatan_ringkas_guru',
    });
    setShowRefForm(true);
  };

  const handleSaveRefForm = () => {
    const normalized = normalizeReferensiSumberInput(
      {
        ...(editingRefId ? { id: editingRefId } : {}),
        ...refForm,
      },
      { jenjang, kelas, mataPelajaran: mapel }
    );
    if (!normalized.ok || !normalized.item) {
      setRefFormError(normalized.error || 'Data referensi belum valid.');
      return;
    }

    const existingList = Array.isArray(editableDoc.referensiSumber)
      ? editableDoc.referensiSumber
      : [];
    const nextList = editingRefId
      ? existingList.map((item) => (item.id === editingRefId ? normalized.item! : item))
      : [...existingList, normalized.item!];

    applyReferensiListToDoc(nextList);
    setShowRefForm(false);
    setEditingRefId(null);
    setRefFormError(null);
    setRefFormWarning(normalized.warning || null);
    showToast(
      normalized.warning
        ? `Referensi disimpan (${normalized.warning})`
        : editingRefId
        ? 'Referensi sumber ajar diperbarui.'
        : 'Referensi sumber ajar ditambahkan.'
    );
  };

  const handleDeleteRef = (refId: string) => {
    const existingList = Array.isArray(editableDoc.referensiSumber)
      ? editableDoc.referensiSumber
      : [];
    const nextList = existingList.filter((item) => item.id !== refId);
    if (editingRefId === refId) {
      setShowRefForm(false);
      setEditingRefId(null);
      setRefFormError(null);
    }
    applyReferensiListToDoc(nextList);
    showToast('Referensi sumber ajar dihapus tanpa mengubah struktur modul.');
  };

  const handlePublishToSharedBank = async () => {
    if (!requireActiveLicenseForAction('membagikan draf ke Bank Referensi Guru')) {
      return;
    }
    setIsPublishing(true);
    try {
      const res = await publishSharedCurriculum({
        type: 'modul_ajar',
        jenjang,
        kelas,
        mapel,
        tpKode,
        materiPokok,
        model: selectedModel,
        data: editableDoc as unknown as Record<string, unknown>,
      });
      if (res.ok) {
        showToast('Draf berhasil dibagikan ke Bank Referensi Guru!');
      } else {
        alert(res.message || 'Gagal membagikan ke Bank Referensi Guru.');
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Terjadi kesalahan';
      alert('Terjadi kesalahan saat membagikan draf: ' + msg);
    } finally {
      setIsPublishing(false);
    }
  };

  const applyCuratedExampleCopy = (example: CuratedModulExample) => {
    flushModulSaveNow();
    const cloned = cloneCuratedExampleAsTeacherDraft(
      example.id,
      activeProfile,
      effectiveTP,
      editableDoc.referensiSumber
    );
    setEditableDoc(cloned);
    if (isValidModulAjarModelType(cloned.modelType)) {
      setSelectedModel(cloned.modelType);
    }
    syncTimeStatesFromDoc(cloned);
    setPendingModelSwitch(null);
    setAiFailureNotice(null);
    setIsFromCommunity(false);
    setPreviewingExample(null);
    setConfirmUseExample(false);
    setShowExamplesPanel(false);
    saveToLocalStorage(
      cloned,
      'user_edited',
      cloned.modelType || example.modelType
    );
    showToast(
      `Contoh "${example.tema}" (${example.jenjang}) disalin ke draf Anda & siap disesuaikan.`
    );
  };

  const handleRequestUseExample = (example: CuratedModulExample) => {
    const hasTeacherChanges =
      editableDoc.draftSource === 'user_edited' ||
      editableDoc.draftSource === 'ai_generated' ||
      isLegacyDifferentiatedDraft;
    if (hasTeacherChanges) {
      setConfirmUseExample(true);
      return;
    }
    applyCuratedExampleCopy(example);
  };

  const handleCopyText = () => {
    let text = `MODUL AJAR KURIKULUM MERDEKA: ${displayDoc.materiPokok}\n`;
    text += `Mata Pelajaran: ${displayDoc.mataPelajaran} | Kelas: ${displayDoc.kelas} (${displayDoc.jenjangFase})\n`;
    text += `Alokasi Waktu: ${displayDoc.alokasiWaktu}\n\n`;
    text += `TUJUAN PEMBELAJARAN (TP ${displayDoc.tpKode}):\n${displayDoc.tujuanPembelajaran}\n\n`;
    text += `PEMAHAMAN BERMAKNA:\n${displayDoc.pemahamanBermakna}\n\n`;
    text += `PERTANYAAN PEMANTIK:\n${(displayDoc.pertanyaanPemantik || []).map((q, i) => `${i + 1}. ${q}`).join('\n')}\n\n`;
    navigator.clipboard.writeText(text);
    setCopied(true);
    showToast('Teks Modul Ajar berhasil disalin!');
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="animate-fade-in" style={{ maxWidth: 960, margin: '20px auto', padding: '0 16px' }}>
      {toastMsg && (
        <div
          className="no-print"
          style={{
            position: 'fixed',
            bottom: 24,
            right: 16,
            maxWidth: 'calc(100vw - 32px)',
            background: '#059669',
            color: '#ffffff',
            padding: '12px 20px',
            borderRadius: 12,
            boxShadow: '0 10px 25px rgba(5, 150, 105, 0.28)',
            zIndex: 999,
            fontSize: 13,
            fontWeight: 700,
            display: 'flex',
            alignItems: 'center',
            gap: 8,
          }}
        >
          <Check size={16} /> {toastMsg}
        </div>
      )}

      {/* Top Controls Action Bar */}
      <div
        className="no-print glass-panel"
        style={{
          padding: '16px 20px',
          marginBottom: 18,
          display: 'flex',
          flexDirection: 'column',
          gap: 14,
        }}
      >
        {/* Baris 1: Navigasi, Badge, & Tombol Ekspor */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: 12,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            <button
              onClick={() => {
                flushModulSaveNow();
                onBackToClassHub();
              }}
              className="btn btn-sm btn-outline"
              style={{ borderColor: '#cbd5e1', background: '#f8fafc', fontWeight: 700 }}
            >
              <ArrowLeft size={14} /> Materi Kelas
            </button>
            <span className="badge badge-indigo">
              📘 Modul Ajar (RPP Kurikulum Merdeka)
            </span>
            <span
              style={{
                fontSize: 11,
                fontWeight: 700,
                padding: '3px 9px',
                borderRadius: 999,
                background:
                  editableDoc.draftSource === 'ai_generated'
                    ? '#ecfdf5'
                    : editableDoc.draftSource === 'template'
                      ? '#fffbeb'
                      : '#eff6ff',
                color:
                  editableDoc.draftSource === 'ai_generated'
                    ? '#047857'
                    : editableDoc.draftSource === 'template'
                      ? '#b45309'
                      : '#1d4ed8',
                border: '1px solid currentColor',
              }}
            >
              {editableDoc.draftSource === 'ai_generated'
                ? '✨ AI Generated'
                : editableDoc.draftSource === 'template'
                  ? '🧩 Template / Draf Awal'
                  : '✏️ Edit Guru'}
            </span>
            <span
              role="status"
              style={{
                fontSize: 12,
                color: saveStatus === 'Gagal menyimpan' ? '#dc2626' : '#059669',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 5,
                fontWeight: 600,
              }}
            >
              <Save size={13} /> {saveStatus}
            </span>
            <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>
              TP {editableDoc.tpKode || modul.tpKode} • {editableDoc.alokasiWaktu || modul.alokasiWaktu}
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <button
              type="button"
              data-testid="modul-open-examples-btn"
              onClick={() => setShowExamplesPanel((prev) => !prev)}
              className="btn btn-sm btn-outline"
              style={{
                borderColor: showExamplesPanel || isExamplePreview ? '#0f766e' : '#94a3b8',
                background: showExamplesPanel || isExamplePreview ? '#f0fdfa' : '#ffffff',
                color: showExamplesPanel || isExamplePreview ? '#0f766e' : '#1e293b',
                fontWeight: 700,
              }}
              title="Lihat 4 contoh modul siap ajar (SD, SMP, SMA, SMK) sebagai template acuan"
            >
              <BookOpen size={14} /> {showExamplesPanel ? 'Tutup Contoh' : 'Contoh Modul (4 Jenjang)'}
            </button>

            <button onClick={handleCopyText} className="btn btn-sm btn-outline">
              {copied ? <Check size={14} color="#10b981" /> : <Copy size={14} />}
              {copied ? 'Tersalin!' : 'Salin Teks'}
            </button>

            <button
              onClick={async () => {
                try {
                  const ok = await exportModulAjarToDocx(displayDoc, sheetProfile);
                  if (ok) {
                    showToast('File Word (.docx) berhasil diunduh!');
                  }
                } catch (e: unknown) {
                  const msg = e instanceof Error ? e.message : 'Terjadi kesalahan';
                  alert('Gagal mengunduh file Word: ' + msg);
                }
              }}
              className="btn btn-sm btn-primary"
              style={{ background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)' }}
              title="Download file Microsoft Word (.docx) yang bisa diedit langsung"
            >
              <FileDown size={14} /> Unduh Word (.docx)
            </button>

            <button onClick={onPrint} className="btn btn-sm btn-success">
              <Printer size={14} /> Cetak / PDF
            </button>
          </div>
        </div>

        {/* Baris 2: Kontrol Model Pedagogis, Konteks, AI & Bank Referensi */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            flexWrap: 'wrap',
            paddingTop: 12,
            borderTop: '1px solid #e2e8f0',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: '1 1 260px', minWidth: 220 }}>
            <label
              htmlFor="modul-model-select"
              style={{ fontSize: 12, fontWeight: 700, color: '#475569', whiteSpace: 'nowrap' }}
            >
              Model:
            </label>
            <select
              id="modul-model-select"
              aria-label="Pilih Model Pembelajaran"
              value={selectedModel}
              onChange={(e) => handleModelSelectChange(e.target.value as ModulAjarModelType)}
              className="form-select form-select-sm"
              style={{
                fontSize: 13,
                padding: '6px 10px',
                borderRadius: 8,
                border: '1px solid #cbd5e1',
                fontWeight: 600,
                background: '#ffffff',
                color: '#0f172a',
                width: '100%',
              }}
            >
              {MODUL_AJAR_MODELS.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.label}
                </option>
              ))}
            </select>
          </div>

          {selectedModel === 'cooperative' && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, flex: '0 1 210px' }}>
              <label
                htmlFor="modul-coop-variant"
                style={{ fontSize: 12, fontWeight: 700, color: '#475569', whiteSpace: 'nowrap' }}
              >
                Teknik:
              </label>
              <select
                id="modul-coop-variant"
                aria-label="Variasi Teknik Cooperative Learning"
                value={cooperativeVariant}
                onChange={(e) => {
                  const nextVar = e.target.value as CooperativeTechniqueVariant;
                  if (editableDoc.draftSource === 'template') {
                    applyModelSyntaxSwitch('cooperative', nextVar);
                  } else {
                    setCooperativeVariant(nextVar);
                    const updated = { ...editableDoc, variasiTeknikModel: nextVar };
                    setEditableDoc(updated);
                    saveToLocalStorage(updated, updated.draftSource === 'ai_generated' ? 'ai_generated' : 'user_edited');
                  }
                }}
                className="form-select form-select-sm"
                style={{
                  fontSize: 12.5,
                  padding: '6px 8px',
                  borderRadius: 8,
                  border: '1px solid #cbd5e1',
                  fontWeight: 600,
                  background: '#ffffff',
                  color: '#0f172a',
                }}
              >
                {COOPERATIVE_TECHNIQUE_VARIANTS.map((v) => (
                  <option key={v} value={v}>
                    {v}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div style={{ flex: '2 1 240px', minWidth: 200 }}>
            <input
              type="text"
              placeholder="Konteks / Isu Nyata (Opsional, misal: Limbah pasar lokal)"
              value={konteksInput}
              onChange={(e) => setKonteksInput(e.target.value)}
              className="form-input form-input-sm"
              style={{
                width: '100%',
                fontSize: 13,
                padding: '6px 12px',
                borderRadius: 8,
                border: '1px solid #cbd5e1',
                background: '#ffffff',
              }}
            />
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <button
              onClick={handleGenerateAI}
              disabled={isGenerating}
              className="btn btn-sm btn-primary"
              style={{
                background: 'linear-gradient(135deg, #4f46e5 0%, #3730a3 100%)',
                color: '#ffffff',
                fontWeight: 700,
                whiteSpace: 'nowrap',
              }}
            >
              {isGenerating ? (
                <>
                  <RefreshCw size={14} className="animate-spin" /> Membuat AI...
                </>
              ) : (
                <>
                  <Sparkles size={14} /> ✨ Buat / Regenerasi AI
                </>
              )}
            </button>

            <button
              onClick={handlePublishToSharedBank}
              disabled={isPublishing}
              className="btn btn-sm btn-outline"
              style={{
                borderColor: '#818cf8',
                color: '#4338ca',
                background: '#eef2ff',
                fontWeight: 700,
                whiteSpace: 'nowrap',
              }}
              title="Bagikan draf modul ke Bank Referensi Guru"
            >
              {isPublishing ? (
                <>
                  <RefreshCw size={14} className="animate-spin" /> Membagikan...
                </>
              ) : (
                <>
                  <Share2 size={14} /> 🤝 Bagikan ke Bank Referensi
                </>
              )}
            </button>
          </div>
        </div>

        {/* Baris 3: Pengaturan Alokasi Waktu (JP & Menit) + Validasi + Pratinjau Sintaks Model */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
            gap: 12,
            paddingTop: 12,
            borderTop: '1px solid #e2e8f0',
          }}
        >
          {/* Panel Waktu */}
          <div
            style={{
              background: '#f8fafc',
              border: '1px solid #cbd5e1',
              borderRadius: 10,
              padding: '10px 12px',
              fontSize: 12,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 6, marginBottom: 8 }}>
              <span style={{ fontWeight: 800, color: '#0f172a', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                <Clock size={14} color="#1d4ed8" /> Pengaturan Waktu ({resolvedTimePreset.jenjangKategori})
              </span>
              <span
                data-testid="modul-time-validation-badge"
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  padding: '2px 8px',
                  borderRadius: 999,
                  background: timeValidation.isValid ? '#dcfce7' : '#fef3c7',
                  color: timeValidation.isValid ? '#166534' : '#92400e',
                  border: `1px solid ${timeValidation.isValid ? '#86efac' : '#fcd34d'}`,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 4,
                }}
              >
                {timeValidation.isValid ? (
                  <>
                    <CheckCircle2 size={12} /> Total {activeMeetingPlan.totalMenitPertemuan} mnt/pertemuan ✓
                  </>
                ) : (
                  <>
                    <AlertTriangle size={12} /> Selisih waktu tahap
                  </>
                )}
              </span>
            </div>

            {resolvedTimePreset.jenjangKategori === 'SMK' && (
              <div style={{ marginBottom: 8 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                  <span style={{ fontWeight: 700, color: '#334155', fontSize: 11.5 }}>Kelompok Mapel SMK:</span>
                  {(['umum', 'kejuruan'] as const).map((track) => {
                    const active = resolvedTimePreset.smkTrack === track;
                    return (
                      <button
                        key={track}
                        type="button"
                        onClick={() => applyTimeConfigChange({ nextSmkTrack: track })}
                        className={`btn btn-sm ${active ? 'btn-primary' : 'btn-outline'}`}
                        style={{ padding: '2px 8px', fontSize: 11, fontWeight: 700 }}
                      >
                        {track === 'umum' ? 'SMK Umum (3 JP)' : 'SMK Kejuruan (4 JP)'}
                      </button>
                    );
                  })}
                </div>
                {resolvedTimePreset.needsManualTrackSelection && (
                  <div style={{ marginTop: 4, fontSize: 11, color: '#b45309', fontWeight: 600 }}>
                    Mapel SMK ini belum teridentifikasi otomatis — pilih Umum atau Kejuruan sesuai struktur KOSP.
                  </div>
                )}
              </div>
            )}

            <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 8, marginBottom: 8 }}>
              <label style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontWeight: 600, color: '#334155' }}>
                JP/Pertemuan:
                <input
                  type="number"
                  min={1}
                  max={12}
                  aria-label="JP per pertemuan"
                  value={jpPerPertemuan}
                  onChange={(e) => {
                    const val = Number(e.target.value);
                    if (Number.isFinite(val) && val >= 1) {
                      applyTimeConfigChange({ nextJP: val });
                    }
                  }}
                  style={{ width: 54, padding: '3px 6px', borderRadius: 6, border: '1px solid #cbd5e1', fontWeight: 700, textAlign: 'center' }}
                />
              </label>

              <label style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontWeight: 600, color: '#334155' }}>
                Menit/JP:
                <input
                  type="number"
                  min={20}
                  max={90}
                  aria-label="Menit per JP"
                  value={menitPerJP}
                  onChange={(e) => {
                    const val = Number(e.target.value);
                    if (Number.isFinite(val) && val >= 20) {
                      applyTimeConfigChange({ nextMenit: val });
                    }
                  }}
                  style={{ width: 56, padding: '3px 6px', borderRadius: 6, border: '1px solid #cbd5e1', fontWeight: 700, textAlign: 'center' }}
                />
              </label>

              <label style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontWeight: 600, color: '#334155' }}>
                Pertemuan:
                <input
                  type="number"
                  min={1}
                  max={12}
                  aria-label="Jumlah pertemuan"
                  value={jumlahPertemuan}
                  onChange={(e) => {
                    const val = Number(e.target.value);
                    if (Number.isFinite(val) && val >= 1) {
                      applyTimeConfigChange({ nextMeetings: val });
                    }
                  }}
                  style={{ width: 52, padding: '3px 6px', borderRadius: 6, border: '1px solid #cbd5e1', fontWeight: 700, textAlign: 'center' }}
                />
              </label>
            </div>

            <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 6, marginBottom: 6 }}>
              <span style={{ fontSize: 11, color: '#64748b' }}>Preset JP:</span>
              {resolvedTimePreset.presetOptionsJP.map((jpOpt) => (
                <button
                  key={jpOpt}
                  type="button"
                  onClick={() => applyTimeConfigChange({ nextJP: jpOpt })}
                  style={{
                    fontSize: 11,
                    fontWeight: jpPerPertemuan === jpOpt ? 800 : 600,
                    padding: '2px 8px',
                    borderRadius: 6,
                    border: jpPerPertemuan === jpOpt ? '1px solid #2563eb' : '1px solid #cbd5e1',
                    background: jpPerPertemuan === jpOpt ? '#dbeafe' : '#ffffff',
                    color: jpPerPertemuan === jpOpt ? '#1d4ed8' : '#475569',
                    cursor: 'pointer',
                  }}
                >
                  {jpOpt} JP ({jpOpt * menitPerJP} mnt)
                </button>
              ))}
            </div>

            <div style={{ fontSize: 11, color: '#475569', lineHeight: 1.45 }}>
              Alokasi TP: <strong>{totalAlokasiJPTP} JP</strong> · Saran: <strong>{activeMeetingPlan.jumlahPertemuanDisarankan} pertemuan</strong> × {jpPerPertemuan} JP ·{' '}
              <span style={{ color: timeValidation.isValid ? '#047857' : '#b45309', fontWeight: 600 }}>
                {timeValidation.summaryMessage}
              </span>
              {!timeValidation.isValid && (
                <button
                  type="button"
                  onClick={handleAutoReconcileDurations}
                  style={{
                    marginLeft: 6,
                    padding: '1px 7px',
                    fontSize: 11,
                    fontWeight: 700,
                    borderRadius: 5,
                    border: '1px solid #d97706',
                    background: '#fef3c7',
                    color: '#92400e',
                    cursor: 'pointer',
                  }}
                >
                  Sesuaikan Otomatis
                </button>
              )}
            </div>
          </div>

          {/* Panel Pratinjau Sintaks Model */}
          <div
            data-testid="modul-syntax-preview"
            style={{
              background: '#f8fafc',
              border: '1px solid #cbd5e1',
              borderRadius: 10,
              padding: '10px 12px',
              fontSize: 12,
            }}
          >
            <div style={{ fontWeight: 800, color: '#0f172a', marginBottom: 6, display: 'flex', alignItems: 'center', gap: 6 }}>
              <Layers size={14} color="#0d9488" /> Pratinjau Sintaks: {selectedModelDef.label}
            </div>
            <ol style={{ margin: '0 0 6px 16px', padding: 0, color: '#334155', lineHeight: 1.45, fontSize: 11.5 }}>
              {selectedModelDef.tahapanSintaks.map((st) => (
                <li key={st.id} style={{ marginBottom: 2 }}>
                  <strong>{st.namaTahap}</strong> — <span style={{ color: '#64748b' }}>{st.tujuanTahap}</span>
                </li>
              ))}
            </ol>
            <div style={{ fontSize: 11, color: '#64748b', fontStyle: 'italic' }}>
              Catatan: Diferensiasi konten, proses, &amp; produk diterapkan sebagai strategi pendampingan lintas model.
            </div>
          </div>
        </div>

        {/* Baris 4: Panel Referensi Sumber Ajar SIBI & Catatan Materi Guru */}
        <div
          data-testid="modul-referensi-sumber-panel"
          style={{
            background: '#f8fafc',
            border: '1px solid #cbd5e1',
            borderRadius: 10,
            padding: '10px 12px',
            fontSize: 12,
            boxSizing: 'border-box',
            minWidth: 0,
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: 8,
              marginBottom: 8,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 6, minWidth: 0 }}>
              <BookOpen size={14} color="#0f766e" />
              <span style={{ fontWeight: 800, color: '#0f172a' }}>
                Referensi Sumber Ajar (Buku SIBI / Panduan)
              </span>
              <span
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  padding: '2px 8px',
                  borderRadius: 999,
                  background: editableDoc.referensiSumber?.length ? '#dcfce7' : '#e2e8f0',
                  color: editableDoc.referensiSumber?.length ? '#166534' : '#475569',
                }}
              >
                {editableDoc.referensiSumber?.length
                  ? `${editableDoc.referensiSumber.length} Sumber`
                  : 'Belum ditautkan'}
              </span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 6 }}>
              <a
                href={SIBI_CATALOG_URL}
                target="_blank"
                rel="noopener noreferrer"
                data-testid="modul-open-sibi-catalog"
                className="btn btn-sm btn-outline"
                style={{
                  fontSize: 11.5,
                  fontWeight: 700,
                  borderColor: '#0d9488',
                  color: '#0f766e',
                  background: '#ffffff',
                  textDecoration: 'none',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 4,
                }}
              >
                <ExternalLink size={12} /> Buka Katalog SIBI
              </a>
              <button
                type="button"
                data-testid="modul-add-referensi-btn"
                onClick={openNewRefForm}
                className="btn btn-sm btn-primary"
                style={{
                  fontSize: 11.5,
                  fontWeight: 700,
                  background: '#0f766e',
                  borderColor: '#0f766e',
                  color: '#ffffff',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 4,
                }}
              >
                <Plus size={12} /> Tambah Referensi
              </button>
            </div>
          </div>

          {!editableDoc.referensiSumber?.length ? (
            <div
              data-testid="modul-referensi-empty-state"
              style={{
                fontSize: 11.5,
                color: '#475569',
                fontStyle: 'italic',
                background: '#ffffff',
                border: '1px dashed #cbd5e1',
                borderRadius: 8,
                padding: '8px 10px',
                overflowWrap: 'anywhere',
              }}
            >
              {PROVENANCE_MSG_UNLINKED}
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {editableDoc.referensiSumber.map((ref) => (
                <div
                  key={ref.id}
                  data-testid="modul-referensi-item"
                  style={{
                    background: '#ffffff',
                    border: '1px solid #cbd5e1',
                    borderRadius: 8,
                    padding: '8px 10px',
                    minWidth: 0,
                    overflowWrap: 'anywhere',
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'flex-start',
                      flexWrap: 'wrap',
                      gap: 6,
                      marginBottom: 4,
                    }}
                  >
                    <div style={{ fontWeight: 700, color: '#0f172a', fontSize: 12, minWidth: 0 }}>
                      <span
                        style={{
                          fontSize: 10.5,
                          fontWeight: 700,
                          padding: '1px 6px',
                          borderRadius: 6,
                          background:
                            ref.jenisSumber === 'sibi_kemendikdasmen' ? '#dbeafe' : '#f1f5f9',
                          color: ref.jenisSumber === 'sibi_kemendikdasmen' ? '#1e40af' : '#334155',
                          marginRight: 6,
                        }}
                      >
                        {JENIS_REFERENSI_LABELS[ref.jenisSumber]}
                      </span>
                      {ref.judulBuku}
                    </div>
                    <div style={{ display: 'flex', gap: 4 }}>
                      <button
                        type="button"
                        onClick={() => openEditRefForm(ref)}
                        className="btn btn-sm btn-outline"
                        style={{ padding: '2px 7px', fontSize: 11, display: 'inline-flex', alignItems: 'center', gap: 3 }}
                      >
                        <Pencil size={11} /> Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteRef(ref.id)}
                        className="btn btn-sm btn-outline"
                        style={{
                          padding: '2px 7px',
                          fontSize: 11,
                          borderColor: '#fca5a5',
                          color: '#b91c1c',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 3,
                        }}
                      >
                        <Trash2 size={11} /> Hapus
                      </button>
                    </div>
                  </div>
                  <div style={{ fontSize: 11, color: '#475569', lineHeight: 1.45 }}>
                    {[
                      ref.penulis ? `Penulis: ${ref.penulis}` : null,
                      ref.edisiAtauTahun ? `Edisi/Tahun: ${ref.edisiAtauTahun}` : null,
                      ref.jenjang || ref.kelas || ref.mataPelajaran
                        ? [ref.jenjang, ref.kelas ? `Kelas ${ref.kelas}` : null, ref.mataPelajaran]
                            .filter(Boolean)
                            .join(' · ')
                        : null,
                      ref.babAtauSubbab ? `Bab/Subbab: ${ref.babAtauSubbab}` : null,
                      ref.halaman ? `Halaman: ${ref.halaman}` : null,
                    ]
                      .filter(Boolean)
                      .join(' · ') || 'Metadata tambahan belum diisi.'}
                  </div>
                  {ref.urlSumber && (
                    <div style={{ fontSize: 11, marginTop: 2, overflowWrap: 'anywhere', wordBreak: 'break-word' }}>
                      Tautan:{' '}
                      <a
                        href={ref.urlSumber}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{ color: '#0f766e', textDecoration: 'underline' }}
                      >
                        {ref.urlSumber}
                      </a>
                    </div>
                  )}
                  <div style={{ fontSize: 10.5, color: '#64748b', marginTop: 2, fontStyle: 'italic' }}>
                    {getReferensiStatusLabel(ref.statusVerifikasi)}
                    {ref.domainResmiSibi ? ' · Domain resmi Kemendikdasmen (URL saja)' : ''}
                  </div>
                  {ref.catatanMateriGuru && (
                    <div
                      style={{
                        marginTop: 4,
                        fontSize: 11,
                        color: '#334155',
                        background: '#f8fafc',
                        borderRadius: 6,
                        padding: '4px 8px',
                        borderLeft: '3px solid #0d9488',
                      }}
                    >
                      <strong>
                        {ref.jenisAksesMateri === 'teks_disediakan_guru'
                          ? 'Teks Sumber Guru:'
                          : 'Catatan Materi Guru:'}
                      </strong>{' '}
                      {ref.catatanMateriGuru}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {refFormWarning && !showRefForm && (
            <div style={{ marginTop: 6, fontSize: 11, color: '#92400e', background: '#fffbeb', border: '1px solid #fcd34d', borderRadius: 6, padding: '5px 8px' }}>
              ℹ️ {refFormWarning}
            </div>
          )}

          {showRefForm && (
            <div
              data-testid="modul-referensi-form"
              style={{
                marginTop: 10,
                background: '#ffffff',
                border: '1px solid #99f6e4',
                borderRadius: 8,
                padding: '10px 12px',
                display: 'flex',
                flexDirection: 'column',
                gap: 8,
              }}
            >
              <div style={{ fontWeight: 700, fontSize: 12, color: '#0f766e' }}>
                {editingRefId ? 'Edit Referensi Sumber Ajar' : 'Tambah Referensi Sumber Ajar'} (Judul wajib *, kolom lain opsional)
              </div>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
                  gap: 8,
                }}
              >
                <label style={{ display: 'flex', flexDirection: 'column', gap: 2, fontSize: 11, fontWeight: 600 }}>
                  Jenis Sumber (Opsional)
                  <select
                    aria-label="Jenis Sumber Referensi"
                    value={refForm.jenisSumber}
                    onChange={(e) =>
                      setRefForm({ ...refForm, jenisSumber: e.target.value as JenisReferensiSumber })
                    }
                    className="form-select form-select-sm"
                    style={{ fontSize: 12, padding: '5px 8px' }}
                  >
                    <option value="sibi_kemendikdasmen">Buku SIBI Kemendikdasmen</option>
                    <option value="buku_teks_lain">Buku Teks / Panduan Lain</option>
                    <option value="modul_atau_sumber_guru">Modul / Catatan Sumber Guru</option>
                  </select>
                </label>

                <label style={{ display: 'flex', flexDirection: 'column', gap: 2, fontSize: 11, fontWeight: 600 }}>
                  Judul Buku / Sumber * (Wajib)
                  <input
                    type="text"
                    aria-label="Judul Buku Referensi"
                    placeholder="Contoh: IPAS SD/MI Kelas IV"
                    value={refForm.judulBuku}
                    onChange={(e) => {
                      setRefForm({ ...refForm, judulBuku: e.target.value });
                      if (refFormError) setRefFormError(null);
                    }}
                    className="form-input form-input-sm"
                    style={{ fontSize: 12, padding: '5px 8px' }}
                  />
                </label>

                <label style={{ display: 'flex', flexDirection: 'column', gap: 2, fontSize: 11, fontWeight: 600 }}>
                  Penulis (Opsional)
                  <input
                    type="text"
                    aria-label="Penulis Buku"
                    placeholder="Contoh: Amalia Fitri dkk."
                    value={refForm.penulis}
                    onChange={(e) => setRefForm({ ...refForm, penulis: e.target.value })}
                    className="form-input form-input-sm"
                    style={{ fontSize: 12, padding: '5px 8px' }}
                  />
                </label>

                <label style={{ display: 'flex', flexDirection: 'column', gap: 2, fontSize: 11, fontWeight: 600 }}>
                  Edisi / Tahun Terbit (Opsional)
                  <input
                    type="text"
                    aria-label="Edisi atau Tahun Terbit"
                    placeholder="Contoh: Edisi Revisi 2023"
                    value={refForm.edisiAtauTahun}
                    onChange={(e) => setRefForm({ ...refForm, edisiAtauTahun: e.target.value })}
                    className="form-input form-input-sm"
                    style={{ fontSize: 12, padding: '5px 8px' }}
                  />
                </label>

                <label style={{ display: 'flex', flexDirection: 'column', gap: 2, fontSize: 11, fontWeight: 600 }}>
                  Jenjang (Opsional)
                  <input
                    type="text"
                    aria-label="Jenjang Referensi"
                    value={refForm.jenjang}
                    onChange={(e) => setRefForm({ ...refForm, jenjang: e.target.value })}
                    className="form-input form-input-sm"
                    style={{ fontSize: 12, padding: '5px 8px' }}
                  />
                </label>

                <label style={{ display: 'flex', flexDirection: 'column', gap: 2, fontSize: 11, fontWeight: 600 }}>
                  Kelas (Opsional)
                  <input
                    type="text"
                    aria-label="Kelas Referensi"
                    value={refForm.kelas}
                    onChange={(e) => setRefForm({ ...refForm, kelas: e.target.value })}
                    className="form-input form-input-sm"
                    style={{ fontSize: 12, padding: '5px 8px' }}
                  />
                </label>

                <label style={{ display: 'flex', flexDirection: 'column', gap: 2, fontSize: 11, fontWeight: 600 }}>
                  Mata Pelajaran (Opsional)
                  <input
                    type="text"
                    aria-label="Mata Pelajaran Referensi"
                    value={refForm.mataPelajaran}
                    onChange={(e) => setRefForm({ ...refForm, mataPelajaran: e.target.value })}
                    className="form-input form-input-sm"
                    style={{ fontSize: 12, padding: '5px 8px' }}
                  />
                </label>

                <label style={{ display: 'flex', flexDirection: 'column', gap: 2, fontSize: 11, fontWeight: 600 }}>
                  Bab / Subbab (Opsional)
                  <input
                    type="text"
                    aria-label="Bab atau Subbab"
                    placeholder="Contoh: Bab 1 Tumbuhan"
                    value={refForm.babAtauSubbab}
                    onChange={(e) => setRefForm({ ...refForm, babAtauSubbab: e.target.value })}
                    className="form-input form-input-sm"
                    style={{ fontSize: 12, padding: '5px 8px' }}
                  />
                </label>

                <label style={{ display: 'flex', flexDirection: 'column', gap: 2, fontSize: 11, fontWeight: 600 }}>
                  Halaman (Opsional)
                  <input
                    type="text"
                    aria-label="Halaman Referensi"
                    placeholder="Contoh: 1-24"
                    value={refForm.halaman}
                    onChange={(e) => setRefForm({ ...refForm, halaman: e.target.value })}
                    className="form-input form-input-sm"
                    style={{ fontSize: 12, padding: '5px 8px' }}
                  />
                </label>
              </div>

              <label style={{ display: 'flex', flexDirection: 'column', gap: 2, fontSize: 11, fontWeight: 600 }}>
                URL Sumber HTTPS (Opsional — untuk SIBI wajib domain https://buku.kemendikdasmen.go.id)
                <input
                  type="url"
                  aria-label="URL Sumber Referensi"
                  placeholder="https://buku.kemendikdasmen.go.id/katalog/..."
                  value={refForm.urlSumber}
                  onChange={(e) => {
                    setRefForm({ ...refForm, urlSumber: e.target.value });
                    if (refFormError) setRefFormError(null);
                  }}
                  className="form-input form-input-sm"
                  style={{ fontSize: 12, padding: '5px 8px' }}
                />
              </label>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <label style={{ display: 'flex', flexDirection: 'column', gap: 2, fontSize: 11, fontWeight: 600 }}>
                  Catatan / Poin Materi Acuan AI (Opsional)
                  <textarea
                    rows={2}
                    aria-label="Catatan Materi Guru"
                    placeholder="Tulis poin materi atau ringkasan dari buku yang ingin diacu AI..."
                    value={refForm.catatanMateriGuru}
                    onChange={(e) => setRefForm({ ...refForm, catatanMateriGuru: e.target.value })}
                    className="form-input form-input-sm"
                    style={{ fontSize: 12, padding: '5px 8px', resize: 'vertical' }}
                  />
                </label>
                {refForm.catatanMateriGuru.trim().length > 0 && (
                  <label style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 11, color: '#334155', flexWrap: 'wrap' }}>
                    Sifat teks di atas:
                    <select
                      aria-label="Sifat Akses Materi Guru"
                      value={refForm.jenisAksesMateri}
                      onChange={(e) =>
                        setRefForm({
                          ...refForm,
                          jenisAksesMateri: e.target.value as JenisAksesMateriReferensi,
                        })
                      }
                      className="form-select form-select-sm"
                      style={{ fontSize: 11, padding: '2px 6px' }}
                    >
                      <option value="catatan_ringkas_guru">
                        {JENIS_AKSES_MATERI_LABELS.catatan_ringkas_guru}
                      </option>
                      <option value="teks_disediakan_guru">
                        {JENIS_AKSES_MATERI_LABELS.teks_disediakan_guru}
                      </option>
                    </select>
                  </label>
                )}
              </div>

              {refFormError && (
                <div
                  role="alert"
                  data-testid="modul-referensi-url-error"
                  style={{
                    fontSize: 11.5,
                    fontWeight: 600,
                    color: '#b91c1c',
                    background: '#fef2f2',
                    border: '1px solid #fca5a5',
                    borderRadius: 6,
                    padding: '6px 8px',
                  }}
                >
                  {refFormError}
                </div>
              )}

              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <button
                  type="button"
                  data-testid="modul-save-referensi-btn"
                  onClick={handleSaveRefForm}
                  className="btn btn-sm btn-primary"
                  style={{ background: '#0f766e', borderColor: '#0f766e', color: '#ffffff', fontWeight: 700 }}
                >
                  Simpan Referensi
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowRefForm(false);
                    setEditingRefId(null);
                    setRefFormError(null);
                  }}
                  className="btn btn-sm btn-outline"
                >
                  Batal
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Galeri 4 Contoh Modul Terkurasi Siap Ajar (SD, SMP, SMA, SMK) — Task 12.4 */}
        {showExamplesPanel && (
          <div
            data-testid="modul-curated-examples-panel"
            style={{
              borderTop: '1px solid #e2e8f0',
              paddingTop: 12,
              display: 'flex',
              flexDirection: 'column',
              gap: 10,
              boxSizing: 'border-box',
              minWidth: 0,
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: 8,
              }}
            >
              <div style={{ fontSize: 12.5, fontWeight: 800, color: '#0f766e' }}>
                📚 Contoh Modul Pembelajaran Terkurasi Siap Ajar (SD, SMP, SMA, SMK)
              </div>
              <span style={{ fontSize: 11, color: '#475569' }}>
                {CURATED_EXAMPLE_NON_OFFICIAL_DISCLAIMER}
              </span>
            </div>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))',
                gap: 10,
                boxSizing: 'border-box',
                minWidth: 0,
              }}
            >
              {curatedExamples.map((ex) => {
                const isSelectedPreview = previewingExample?.id === ex.id;
                const isJenjangMatch = ex.jenjang === resolvedTimePreset.jenjangKategori;
                return (
                  <div
                    key={ex.id}
                    data-testid={`modul-example-card-${ex.id}`}
                    style={{
                      background: isSelectedPreview ? '#f0fdfa' : '#ffffff',
                      border: `1px solid ${isSelectedPreview ? '#0f766e' : '#cbd5e1'}`,
                      borderRadius: 10,
                      padding: '10px 12px',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between',
                      gap: 8,
                      boxSizing: 'border-box',
                      minWidth: 0,
                      overflowWrap: 'anywhere',
                    }}
                  >
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, alignItems: 'center' }}>
                        <span
                          style={{
                            fontSize: 10.5,
                            fontWeight: 700,
                            padding: '2px 7px',
                            borderRadius: 99,
                            background: '#e0f2fe',
                            color: '#0369a1',
                          }}
                        >
                          {ex.badgeLabel}
                        </span>
                        {isJenjangMatch && (
                          <span
                            style={{
                              fontSize: 10.5,
                              fontWeight: 700,
                              padding: '2px 7px',
                              borderRadius: 99,
                              background: '#dcfce7',
                              color: '#166534',
                            }}
                          >
                            Sesuai Jenjang Anda
                          </span>
                        )}
                      </div>
                      <div style={{ fontSize: 12.5, fontWeight: 800, color: '#0f172a' }}>
                        {ex.jenjang} Kelas {ex.kelas} • {ex.mataPelajaran}
                      </div>
                      <div style={{ fontSize: 12, fontWeight: 700, color: '#1e3a8a' }}>
                        {ex.tema}
                      </div>
                      <div style={{ fontSize: 11, fontWeight: 600, color: '#0f766e' }}>
                        {ex.modelLabel} · {ex.alokasiRingkas}
                      </div>
                      <div style={{ fontSize: 11.5, color: '#475569', lineHeight: 1.4 }}>
                        {ex.ringkasanKeunggulan}
                      </div>
                    </div>

                    <button
                      type="button"
                      data-testid={`modul-preview-example-${ex.id}`}
                      onClick={() => {
                        setPreviewingExample(ex);
                        setConfirmUseExample(false);
                      }}
                      className={isSelectedPreview ? 'btn btn-sm btn-primary' : 'btn btn-sm btn-outline'}
                      style={
                        isSelectedPreview
                          ? { background: '#0f766e', borderColor: '#0f766e', color: '#fff', fontWeight: 700 }
                          : { fontWeight: 700 }
                      }
                    >
                      {isSelectedPreview ? 'Sedang Dipratinjau' : 'Pratinjau Contoh'}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Peringatan Konfirmasi Pergantian Model (saat draf telah disunting guru) */}
        {pendingModelSwitch && (
          <div
            role="alert"
            style={{
              background: '#fffbeb',
              border: '1px solid #f59e0b',
              borderRadius: 10,
              padding: '10px 14px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: 10,
              fontSize: 12.5,
              color: '#92400e',
            }}
          >
            <div>
              <strong>Konfirmasi Pergantian Model:</strong> Draf saat ini berisi suntingan guru atau format lama. Mengganti ke{' '}
              <strong>{getModulAjarModelDefinition(pendingModelSwitch.targetModel).label}</strong> akan menyusun ulang struktur sintaks kegiatan.
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                type="button"
                onClick={() => applyModelSyntaxSwitch(pendingModelSwitch.targetModel)}
                className="btn btn-sm btn-primary"
                style={{ background: '#b45309', borderColor: '#b45309', color: '#fff', fontWeight: 700 }}
              >
                Ya, Terapkan Sintaks Baru
              </button>
              <button
                type="button"
                onClick={() => setPendingModelSwitch(null)}
                className="btn btn-sm btn-outline"
              >
                Batal
              </button>
            </div>
          </div>
        )}

        {/* Info Banner Draf Legacy Model Diferensiasi */}
        {isLegacyDifferentiatedDraft && (
          <div
            style={{
              background: '#eff6ff',
              border: '1px solid #bfdbfe',
              borderRadius: 8,
              padding: '7px 12px',
              fontSize: 12,
              color: '#1e40af',
            }}
          >
            ℹ️ Draf ini memakai label model lama <strong>Berdiferensiasi</strong>. Anda tetap dapat membaca, mengedit, menyimpan, dan mengekspornya, atau memilih salah satu dari 7 sintaks model di atas bila ingin beralih.
          </div>
        )}

        {/* Info Kegagalan / Penolakan AI Tanpa Menghapus Draf Existing */}
        {aiFailureNotice && (
          <div
            role="alert"
            data-testid="modul-ai-failure-banner"
            style={{
              background: '#fef2f2',
              border: '1px solid #fca5a5',
              borderRadius: 10,
              padding: '10px 14px',
              fontSize: 12.5,
              color: '#991b1b',
              display: 'flex',
              flexDirection: 'column',
              gap: 8,
            }}
          >
            <div>
              <strong>Generasi AI Belum Diterapkan — Draf Sebelumnya Tetap Dipertahankan:</strong>{' '}
              {aiFailureNotice.message}{' '}
              {!aiFailureNotice.quotaError &&
                '(Kuota kredit AI tidak terpotong / telah dikembalikan secara otomatis.)'}
            </div>
            {aiFailureNotice.issues && aiFailureNotice.issues.length > 0 && (
              <ul style={{ margin: '0 0 0 18px', padding: 0, fontSize: 11.5 }}>
                {aiFailureNotice.issues.slice(0, 4).map((iss, idx) => (
                  <li key={idx}>{iss}</li>
                ))}
              </ul>
            )}
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {!aiFailureNotice.quotaError && (
                <button
                  type="button"
                  onClick={() => handleGenerateAI()}
                  disabled={isGenerating}
                  className="btn btn-sm btn-primary"
                  style={{ background: '#4f46e5', borderColor: '#4f46e5', color: '#fff', fontWeight: 700 }}
                >
                  Coba AI Lagi
                </button>
              )}
              <button
                type="button"
                onClick={() => {
                  const applied = {
                    ...aiFailureNotice.fallbackDoc,
                    tpId: effectiveTP.id,
                    modelType: selectedModel,
                    draftSource: 'template' as const,
                  };
                  setEditableDoc(applied);
                  syncTimeStatesFromDoc(applied);
                  saveToLocalStorage(applied, 'template', selectedModel);
                  setAiFailureNotice(null);
                  showToast('Template / Draf Awal terstruktur berhasil diterapkan.');
                }}
                className="btn btn-sm btn-outline"
                style={{ borderColor: '#d97706', color: '#92400e', background: '#fffbeb', fontWeight: 700 }}
              >
                Terapkan Template / Draf Awal
              </button>
              <button
                type="button"
                onClick={() => setAiFailureNotice(null)}
                className="btn btn-sm btn-outline"
              >
                Tutup
              </button>
            </div>
          </div>
        )}

        {/* Ringkasan Status Validasi Kualitas Modul */}
        {!isExamplePreview && editableDoc.catatanValidasi && (
          <div
            data-testid="modul-quality-validation-note"
            style={{
              background:
                editableDoc.catatanValidasi.status === 'valid_ai' ? '#ecfdf5' : '#f8fafc',
              border: `1px solid ${
                editableDoc.catatanValidasi.status === 'valid_ai' ? '#86efac' : '#cbd5e1'
              }`,
              borderRadius: 8,
              padding: '6px 12px',
              fontSize: 11.5,
              color:
                editableDoc.catatanValidasi.status === 'valid_ai' ? '#065f46' : '#475569',
            }}
          >
            <strong>
              {editableDoc.catatanValidasi.status === 'valid_ai'
                ? '✓ Lolos Validator Kualitas AI'
                : editableDoc.catatanValidasi.status === 'template_awal'
                  ? '🧩 Template / Draf Awal Terstruktur'
                  : 'ℹ️ Status Peninjauan Modul'}
              :
            </strong>{' '}
            {editableDoc.catatanValidasi.semanticReviewWarnings?.[0] ||
              'Pastikan kesesuaian contoh dan asesmen dengan kondisi nyata kelas Anda.'}
          </div>
        )}
      </div>

      {/* Banner Mode Pratinjau Contoh Terkurasi (Read-only Preview, Non-destructive) */}
      {previewingExample && (
        <div
          className="no-print"
          data-testid="modul-example-preview-banner"
          style={{
            padding: '12px 16px',
            background: '#f0fdfa',
            border: '1px solid #5eead4',
            borderRadius: 10,
            color: '#134e4a',
            fontSize: 12.5,
            display: 'flex',
            flexDirection: 'column',
            gap: 10,
            marginBottom: 16,
            boxSizing: 'border-box',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: 10,
            }}
          >
            <div style={{ display: 'flex', flexDirection: 'column', gap: 2, minWidth: 0, overflowWrap: 'anywhere' }}>
              <div style={{ fontWeight: 800 }}>
                [{previewingExample.badgeLabel}] Mode Pratinjau: {previewingExample.jenjang} Kelas {previewingExample.kelas} — {previewingExample.mataPelajaran} ({previewingExample.tema})
              </div>
              <div style={{ fontSize: 11.5, color: '#0f766e' }}>
                Pratinjau ini bersifat baca-saja dan <strong>tidak mengubah draf Anda yang sedang dibuka</strong>. {previewingExample.provenanceDisclaimer}
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <button
                type="button"
                data-testid="modul-use-example-btn"
                onClick={() => handleRequestUseExample(previewingExample)}
                className="btn btn-sm btn-primary"
                style={{ background: '#0f766e', borderColor: '#0f766e', color: '#fff', fontWeight: 700 }}
              >
                Gunakan Contoh Ini (Salin ke Draf)
              </button>
              <button
                type="button"
                data-testid="modul-exit-example-preview-btn"
                onClick={() => {
                  setPreviewingExample(null);
                  setConfirmUseExample(false);
                }}
                className="btn btn-sm btn-outline"
                style={{ fontWeight: 700 }}
              >
                <ArrowLeft size={13} /> Kembali ke Draf Saya
              </button>
            </div>
          </div>

          {confirmUseExample && (
            <div
              role="alert"
              data-testid="modul-use-example-confirm"
              style={{
                background: '#fffbeb',
                border: '1px solid #f59e0b',
                borderRadius: 8,
                padding: '8px 12px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: 8,
                color: '#92400e',
                fontSize: 12,
              }}
            >
              <div>
                <strong>Konfirmasi Salin ke Draf:</strong> Draf aktif saat ini sudah berisi suntingan atau hasil AI. Menyalin contoh ini akan membuat salinan baru pada TP aktif (template asli tetap utuh).
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  type="button"
                  data-testid="modul-confirm-use-example-btn"
                  onClick={() => applyCuratedExampleCopy(previewingExample)}
                  className="btn btn-sm btn-primary"
                  style={{ background: '#b45309', borderColor: '#b45309', color: '#fff', fontWeight: 700 }}
                >
                  Ya, Salin ke Draf Saya
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmUseExample(false)}
                  className="btn btn-sm btn-outline"
                >
                  Batal
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Community Reference Banner */}
      {!isExamplePreview && isFromCommunity && (
        <div
          className="no-print"
          style={{
            padding: '8px 16px',
            background: '#eff6ff',
            border: '1px solid #bfdbfe',
            borderRadius: 8,
            color: '#1e40af',
            fontSize: 13,
            fontWeight: 600,
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            marginBottom: 16,
          }}
        >
          💡 Draf berikut adalah referensi guru lainnya • Siap disesuaikan
        </div>
      )}

      {/* Printable Sheet Canvas */}
      <div
        ref={sheetRef}
        className="print-sheet"
        style={{
          background: '#ffffff',
          color: '#1e293b',
          borderRadius: 'var(--radius-lg)',
          padding: 'clamp(18px, 4vw, 40px) clamp(14px, 4vw, 48px)',
          boxShadow: 'var(--shadow-lg)',
          minHeight: 800,
        }}
      >
        {/* Kop Surat Sekolah */}
        <div
          className="print-kop"
          style={{
            textAlign: 'center',
            borderBottom: '3px double #334155',
            paddingBottom: 12,
            marginBottom: 24,
          }}
        >
          {sheetProfile.pakaiFormatKopSekolah && sheetProfile.instansiDinas && (
            <div style={{ fontSize: 11.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.6, color: '#475569', marginBottom: 2 }}>
              {sheetProfile.instansiDinas}
            </div>
          )}
          <h2 style={{ fontSize: 17, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 0.5, color: '#0f172a' }}>
            {displayDoc.namaSekolah || sheetProfile.namaSekolah}
          </h2>
          {sheetProfile.pakaiFormatKopSekolah && sheetProfile.alamatSekolah && (
            <p style={{ fontSize: 11, color: '#64748b', margin: '2px 0' }}>
              {sheetProfile.alamatSekolah} {sheetProfile.kotaSekolah ? `• ${sheetProfile.kotaSekolah}` : ''}
            </p>
          )}
          <h1 style={{ fontSize: 18, fontWeight: 800, color: '#1d4ed8', margin: '6px 0 2px' }}>
            MODUL AJAR KURIKULUM MERDEKA
          </h1>
          <p style={{ fontSize: 12, color: '#475569' }}>
            TAHUN AJARAN {displayDoc.tahunAjaran || sheetProfile.tahunAjaran} • SEMESTER {(displayDoc.semester || '1').toUpperCase()}
          </p>
        </div>

        {/* I. INFORMASI UMUM */}
        <div style={{ marginBottom: 26 }}>
          <h3 style={{ fontSize: 15, fontWeight: 800, color: '#1e3a8a', borderBottom: '2px solid #e2e8f0', paddingBottom: 4, marginBottom: 12 }}>
            I. INFORMASI UMUM
          </h3>

          <div className="print-table-scroll" style={{ width: '100%', overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, marginBottom: 14 }}>
            <tbody>
              <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
                <td style={{ padding: '6px 8px', width: '28%', fontWeight: 700, color: '#475569' }}>Satuan Pendidikan</td>
                <td style={{ padding: '6px 8px' }}>: {displayDoc.namaSekolah || sheetProfile.namaSekolah}</td>
              </tr>
              <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
                <td style={{ padding: '6px 8px', fontWeight: 700, color: '#475569' }}>Penyusun / Guru Mapel</td>
                <td style={{ padding: '6px 8px' }}>: {displayDoc.namaGuru || sheetProfile.namaGuru}</td>
              </tr>
              <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
                <td style={{ padding: '6px 8px', fontWeight: 700, color: '#475569' }}>Mata Pelajaran</td>
                <td style={{ padding: '6px 8px' }}>: <strong>{displayDoc.mataPelajaran}</strong></td>
              </tr>
              <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
                <td style={{ padding: '6px 8px', fontWeight: 700, color: '#475569' }}>Fase / Kelas / Rombel</td>
                <td style={{ padding: '6px 8px' }}>: {displayDoc.jenjangFase} / Kelas {displayDoc.kelas} ({isExamplePreview ? displayDoc.rombel : sheetProfile.rombelAktif || displayDoc.rombel})</td>
              </tr>
              <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
                <td style={{ padding: '6px 8px', fontWeight: 700, color: '#475569' }}>Elemen Capaian</td>
                <td style={{ padding: '6px 8px' }}>: {displayDoc.elemen}</td>
              </tr>
              <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
                <td style={{ padding: '6px 8px', fontWeight: 700, color: '#475569' }}>Alokasi Waktu</td>
                <td style={{ padding: '6px 8px' }}>: {displayDoc.alokasiWaktu}</td>
              </tr>
              <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
                <td style={{ padding: '6px 8px', fontWeight: 700, color: '#475569' }}>Model Pembelajaran</td>
                <td style={{ padding: '6px 8px' }}>: {displayDoc.modelPembelajaran}</td>
              </tr>
            </tbody>
          </table>
          </div>

          {/* Kompetensi Awal, Profil Pancasila & Sarana */}
          <div style={{ background: '#f8fafc', padding: '14px 18px', borderRadius: 10, border: '1px solid #e2e8f0', fontSize: 12.5 }}>
            <div style={{ marginBottom: 10 }}>
              <strong style={{ color: '#1e40af' }}>Kompetensi Awal (Prasyarat Peserta Didik):</strong>
              {(displayDoc.kompetensiAwal && displayDoc.kompetensiAwal.length > 0 ? displayDoc.kompetensiAwal : ['']).map((ka, idx) => (
                <div key={idx} style={{ marginTop: 4 }}>
                  <AutoExpandingTextarea
                    value={ka}
                    readOnly={isExamplePreview}
                    onChange={(e) => {
                      if (isExamplePreview) return;
                      const list = [...(editableDoc.kompetensiAwal || [''])];
                      list[idx] = e.target.value;
                      const updated = { ...editableDoc, kompetensiAwal: list };
                      setEditableDoc(updated);
                      saveToLocalStorage(updated);
                    }}
                    rows={1}
                    style={{ fontSize: 12.5, color: '#334155' }}
                    placeholder="Isi pengetahuan/keterampilan prasyarat sebelum materi ini..."
                  />
                </div>
              ))}
            </div>
            <div style={{ marginBottom: 8 }}>
              <strong style={{ color: '#1e40af' }}>Profil Pelajar Pancasila yang Dikembangkan:</strong>
              <ul style={{ margin: '4px 0 0 18px', padding: 0, color: '#334155' }}>
                {(displayDoc.profilPelajarPancasila || []).map((p, i) => (
                  <li key={i}>{p}</li>
                ))}
              </ul>
            </div>
            <div>
              <strong style={{ color: '#1e40af' }}>Sarana & Prasarana:</strong>
              <ul style={{ margin: '4px 0 0 18px', padding: 0, color: '#334155' }}>
                {(displayDoc.saranaPrasarana || []).map((s, i) => (
                  <li key={i}>{s}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        {/* II. KOMPONEN INTI */}
        <div style={{ marginBottom: 26 }}>
          <h3 style={{ fontSize: 15, fontWeight: 800, color: '#1e3a8a', borderBottom: '2px solid #e2e8f0', paddingBottom: 4, marginBottom: 12 }}>
            II. KOMPONEN INTI PEMBELAJARAN
          </h3>

          <div style={{ marginBottom: 12 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#0f172a' }}>
              A. Tujuan Pembelajaran (TP {displayDoc.tpKode}):
            </div>
            <div style={{ fontSize: 13, color: '#1e293b', background: '#eff6ff', padding: '10px 14px', borderRadius: 8, marginTop: 4 }}>
              {displayDoc.tujuanPembelajaran}
            </div>
            {displayDoc.targetSubTP && displayDoc.targetSubTP.length > 0 && (
              <div style={{ marginTop: 8, padding: '8px 12px', borderRadius: 8, background: '#f8fafc', border: '1px solid #cbd5e1', fontSize: 12 }}>
                <strong style={{ color: '#1e40af' }}>Target Sub-TP / Indikator Pertemuan:</strong>
                <ul style={{ margin: '4px 0 0 18px', padding: 0, color: '#334155' }}>
                  {displayDoc.targetSubTP.map((sub, sIdx) => (
                    <li key={sub.id || sIdx} style={{ marginBottom: 2 }}>
                      <strong>{sub.kode}:</strong> {sub.kompetensi}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {displayDoc.bahanBacaan && (
            <div
              data-testid="modul-materi-ajar-konkret"
              style={{ marginBottom: 14, padding: '12px 14px', borderRadius: 8, background: '#f0fdf4', border: '1px solid #bbf7d0', fontSize: 12.5, color: '#1e293b' }}
            >
              <div style={{ fontSize: 13.5, fontWeight: 800, color: '#166534', marginBottom: 6, display: 'flex', alignItems: 'center', gap: 6 }}>
                <BookOpen size={15} /> Materi Ajar Konkret &amp; Bahan Bacaan Guru–Siswa:
              </div>
              <AutoExpandingTextarea
                value={
                  displayDoc.bahanBacaan.penjelasanKonsepUtama ||
                  displayDoc.bahanBacaan.ringkasanInti ||
                  ''
                }
                readOnly={isExamplePreview}
                onChange={(e) => {
                  if (isExamplePreview) return;
                  const updated = {
                    ...editableDoc,
                    bahanBacaan: {
                      ...(editableDoc.bahanBacaan || { konsepKunci: [] }),
                      ringkasanInti: e.target.value,
                      ...(editableDoc.bahanBacaan?.penjelasanKonsepUtama !== undefined
                        ? { penjelasanKonsepUtama: e.target.value }
                        : {}),
                    },
                  };
                  setEditableDoc(updated);
                  saveToLocalStorage(updated);
                }}
                rows={2}
                style={{ fontSize: 12.5, color: '#14532d' }}
              />

              {displayDoc.bahanBacaan.subKonsep && displayDoc.bahanBacaan.subKonsep.length > 0 && (
                <div style={{ marginTop: 8 }}>
                  <strong style={{ color: '#166534' }}>Subkonsep Inti:</strong>
                  <ul style={{ margin: '4px 0 0 18px', padding: 0 }}>
                    {displayDoc.bahanBacaan.subKonsep.map((sk, idx) => (
                      <li key={idx} style={{ marginBottom: 3 }}>
                        <strong>{sk.judul}:</strong> {sk.uraian}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {displayDoc.bahanBacaan.istilahPenting && displayDoc.bahanBacaan.istilahPenting.length > 0 && (
                <div style={{ marginTop: 8 }}>
                  <strong style={{ color: '#166534' }}>Istilah Penting:</strong>
                  <ul style={{ margin: '4px 0 0 18px', padding: 0 }}>
                    {displayDoc.bahanBacaan.istilahPenting.map((it, idx) => (
                      <li key={idx} style={{ marginBottom: 2 }}>
                        <strong>{it.istilah}:</strong> {it.pengertian}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {displayDoc.bahanBacaan.contohKonkret && displayDoc.bahanBacaan.contohKonkret.length > 0 && (
                <div style={{ marginTop: 8 }}>
                  <strong style={{ color: '#166534' }}>Contoh Konkret Kontekstual:</strong>
                  <ul style={{ margin: '4px 0 0 18px', padding: 0 }}>
                    {displayDoc.bahanBacaan.contohKonkret.map((ct, idx) => (
                      <li key={idx} style={{ marginBottom: 2 }}>{ct}</li>
                    ))}
                  </ul>
                </div>
              )}

              {displayDoc.bahanBacaan.contohPenyelesaian && (
                <div style={{ marginTop: 8, background: '#ffffff', border: '1px solid #bbf7d0', borderRadius: 6, padding: '8px 10px' }}>
                  <div style={{ fontWeight: 700, color: '#15803d', marginBottom: 3 }}>
                    {displayDoc.bahanBacaan.contohPenyelesaian.judulContoh}
                  </div>
                  {displayDoc.bahanBacaan.contohPenyelesaian.konteks && (
                    <div style={{ fontSize: 12, color: '#475569', marginBottom: 4 }}>
                      {displayDoc.bahanBacaan.contohPenyelesaian.konteks}
                    </div>
                  )}
                  <ol style={{ margin: '2px 0 4px 18px', padding: 0, fontSize: 12 }}>
                    {displayDoc.bahanBacaan.contohPenyelesaian.langkahPenyelesaian.map((lk, idx) => (
                      <li key={idx} style={{ marginBottom: 2 }}>{lk}</li>
                    ))}
                  </ol>
                  {displayDoc.bahanBacaan.contohPenyelesaian.kesimpulanHasil && (
                    <div style={{ fontSize: 12, fontWeight: 600, color: '#166534' }}>
                      Simpulan: {displayDoc.bahanBacaan.contohPenyelesaian.kesimpulanHasil}
                    </div>
                  )}
                </div>
              )}

              {displayDoc.bahanBacaan.hubunganDenganTP && (
                <div style={{ marginTop: 8, fontSize: 12 }}>
                  <strong style={{ color: '#166534' }}>Keterkaitan dengan TP:</strong>{' '}
                  {displayDoc.bahanBacaan.hubunganDenganTP}
                </div>
              )}

              {displayDoc.bahanBacaan.potensiMiskonsepsi && displayDoc.bahanBacaan.potensiMiskonsepsi.length > 0 && (
                <div style={{ marginTop: 8, background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 6, padding: '8px 10px' }}>
                  <strong style={{ color: '#92400e' }}>Potensi Miskonsepsi &amp; Cara Guru Meluruskannya:</strong>
                  <ul style={{ margin: '4px 0 0 18px', padding: 0, fontSize: 12, color: '#78350f' }}>
                    {displayDoc.bahanBacaan.potensiMiskonsepsi.map((mk, idx) => (
                      <li key={idx} style={{ marginBottom: 4 }}>
                        <strong>Miskonsepsi:</strong> {mk.miskonsepsi} → <strong>Pelurusan Guru:</strong> {mk.caraMeluruskan}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {displayDoc.bahanBacaan.konsepKunci && displayDoc.bahanBacaan.konsepKunci.length > 0 && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 8 }}>
                  {displayDoc.bahanBacaan.konsepKunci.map((kk, kIdx) => (
                    <span
                      key={kIdx}
                      style={{
                        fontSize: 11,
                        fontWeight: 600,
                        padding: '2px 8px',
                        borderRadius: 999,
                        background: '#dcfce7',
                        color: '#166534',
                        border: '1px solid #86efac',
                      }}
                    >
                      {kk}
                    </span>
                  ))}
                </div>
              )}
              {displayDoc.bahanBacaan.referensiCatatan && (
                <div style={{ marginTop: 6, fontSize: 11, color: '#475569', fontStyle: 'italic' }}>
                  {displayDoc.bahanBacaan.referensiCatatan}
                </div>
              )}
            </div>
          )}

          <div style={{ marginBottom: 12 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#0f172a', marginBottom: 2 }}>
              B. Pemahaman Bermakna:
            </div>
            <AutoExpandingTextarea
              value={displayDoc.pemahamanBermakna || ''}
              readOnly={isExamplePreview}
              onChange={(e) => {
                if (isExamplePreview) return;
                const updated = { ...editableDoc, pemahamanBermakna: e.target.value };
                setEditableDoc(updated);
                saveToLocalStorage(updated);
              }}
              rows={2}
              style={{ fontStyle: 'italic', color: '#334155', fontSize: 13 }}
            />
          </div>

          <div style={{ marginBottom: 14 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#0f172a', marginBottom: 4 }}>
              C. Pertanyaan Pemantik:
            </div>
            <ol style={{ margin: '4px 0 0 18px', padding: 0, fontSize: 13, color: '#334155' }}>
              {(displayDoc.pertanyaanPemantik || []).map((q, i) => (
                <li key={i} style={{ marginBottom: 4 }}>
                  <AutoExpandingTextarea
                    value={q}
                    readOnly={isExamplePreview}
                    onChange={(e) => {
                      if (isExamplePreview) return;
                      const list = [...(editableDoc.pertanyaanPemantik || [])];
                      list[i] = e.target.value;
                      const updated = { ...editableDoc, pertanyaanPemantik: list };
                      setEditableDoc(updated);
                      saveToLocalStorage(updated);
                    }}
                    rows={1}
                    style={{ fontSize: 13, color: '#334155' }}
                  />
                </li>
              ))}
            </ol>
          </div>

          {/* Rincian Kegiatan Pembelajaran per Pertemuan */}
          <div style={{ marginTop: 14 }}>
            <div style={{ fontSize: 13, fontWeight: 800, color: '#0f172a', marginBottom: 8 }}>
              D. Langkah-Langkah Kegiatan Pembelajaran:
            </div>

            {(displayDoc.kegiatanPembelajaran || []).map((keg, kIdx) => {
              const sessionVal = validateSessionTimeBudget(
                keg,
                keg.jpPertemuan ||
                  (isExamplePreview
                    ? displayDoc.alokasiWaktuDetail?.jpPerPertemuan || jpPerPertemuan
                    : jpPerPertemuan),
                isExamplePreview
                  ? displayDoc.alokasiWaktuDetail?.menitPerJP || menitPerJP
                  : menitPerJP
              );
              const hasStructured =
                Array.isArray(keg.tahapTerstruktur) && keg.tahapTerstruktur.length > 0;

              const updateStructuredStage = (
                stageId: string,
                patch: Partial<TahapKegiatanTerstruktur>
              ) => {
                if (isExamplePreview) return;
                const updatedKegiatan = [...(editableDoc.kegiatanPembelajaran || [])];
                const targetKeg = { ...updatedKegiatan[kIdx] };
                const nextStages = (targetKeg.tahapTerstruktur || []).map((st) =>
                  st.id === stageId ? { ...st, ...patch } : st
                );
                const synced = syncLegacyArraysFromStructuredStages(nextStages);
                targetKeg.tahapTerstruktur = nextStages;
                targetKeg.pendahuluan = synced.pendahuluan;
                targetKeg.inti = synced.inti;
                targetKeg.penutup = synced.penutup;
                updatedKegiatan[kIdx] = targetKeg;
                const updated: ModulAjarDokumen = {
                  ...editableDoc,
                  draftSource: 'user_edited',
                  kegiatanPembelajaran: updatedKegiatan,
                };
                setEditableDoc(updated);
                saveToLocalStorage(updated, 'user_edited');
              };

              const renderPhaseSection = (
                fase: 'pendahuluan' | 'inti' | 'penutup',
                headingLabel: string,
                headingColor: string
              ) => {
                const stages = (keg.tahapTerstruktur || []).filter((s) => s.fase === fase);
                if (stages.length === 0) return null;
                return (
                  <div style={{ marginBottom: 10 }}>
                    <div style={{ fontSize: 12.5, fontWeight: 800, color: headingColor, marginBottom: 6 }}>
                      {headingLabel}
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      {stages.map((st) => (
                        <div
                          key={st.id}
                          style={{
                            background: '#f8fafc',
                            border: '1px solid #e2e8f0',
                            borderRadius: 8,
                            padding: '8px 11px',
                            fontSize: 12,
                          }}
                        >
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 6, marginBottom: 4 }}>
                            <div style={{ fontWeight: 700, color: '#0f172a' }}>
                              {st.namaTahap}
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 5, flexWrap: 'wrap' }}>
                              {st.pengalamanBelajar && (
                                <span style={{ fontSize: 10.5, fontWeight: 700, padding: '1px 6px', borderRadius: 99, background: '#e0e7ff', color: '#3730a3' }}>
                                  {st.pengalamanBelajar}
                                </span>
                              )}
                              {st.prinsipPembelajaran?.map((pr) => (
                                <span key={pr} style={{ fontSize: 10.5, fontWeight: 600, padding: '1px 6px', borderRadius: 99, background: '#ecfdf5', color: '#047857' }}>
                                  {pr}
                                </span>
                              ))}
                              <span style={{ fontSize: 11, fontWeight: 700, color: '#0d9488', background: '#ccfbf1', padding: '1px 7px', borderRadius: 99 }}>
                                {st.durasiMenit} Menit
                              </span>
                              <input
                                type="number"
                                min={1}
                                max={180}
                                aria-label={`Durasi menit tahap ${st.namaTahap}`}
                                className="no-print"
                                disabled={isExamplePreview}
                                value={st.durasiMenit}
                                onChange={(e) => {
                                  if (isExamplePreview) return;
                                  const nextM = Math.max(1, Math.min(180, Math.round(Number(e.target.value) || 1)));
                                  updateStructuredStage(st.id, { durasiMenit: nextM });
                                }}
                                style={{ width: 46, padding: '1px 4px', fontSize: 11, borderRadius: 5, border: '1px solid #cbd5e1', textAlign: 'center' }}
                              />
                            </div>
                          </div>
                          <div style={{ color: '#475569', marginBottom: 4 }}>
                            <strong>Tujuan Tahap:</strong> {st.tujuanTahap}
                          </div>
                          <div style={{ marginBottom: 4 }}>
                            <strong style={{ color: '#1e3a8a' }}>Aktivitas Guru:</strong>
                            <AutoExpandingTextarea
                              value={st.aktivitasGuru}
                              readOnly={isExamplePreview}
                              onChange={(e) => updateStructuredStage(st.id, { aktivitasGuru: e.target.value })}
                              rows={1}
                              style={{ fontSize: 12, color: '#1e293b', marginTop: 2 }}
                            />
                          </div>
                          <div style={{ marginBottom: 4 }}>
                            <strong style={{ color: '#047857' }}>Aktivitas Siswa:</strong>
                            <AutoExpandingTextarea
                              value={st.aktivitasSiswa}
                              readOnly={isExamplePreview}
                              onChange={(e) => updateStructuredStage(st.id, { aktivitasSiswa: e.target.value })}
                              rows={1}
                              style={{ fontSize: 12, color: '#1e293b', marginTop: 2 }}
                            />
                          </div>
                          <div style={{ color: '#334155', marginBottom: 2 }}>
                            <strong>Instruksi / Pertanyaan Kunci:</strong> <em>{st.instruksiPertanyaan}</em>
                          </div>
                          <div style={{ color: '#475569', fontSize: 11.5 }}>
                            <strong>Media &amp; Bahan:</strong> {st.mediaBahan} · <strong>Bukti Belajar:</strong> {st.buktiBelajar}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              };

              return (
                <div
                  key={keg.pertemuan || kIdx}
                  style={{
                    background: '#ffffff',
                    border: '1px solid #cbd5e1',
                    borderRadius: 10,
                    padding: '14px 18px',
                    marginBottom: 12,
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 6, marginBottom: 6 }}>
                    <div style={{ fontSize: 13.5, fontWeight: 800, color: '#0d9488' }}>
                      Pertemuan Ke-{keg.pertemuan} ({keg.jpPertemuan ? `${keg.jpPertemuan} JP · ` : ''}{keg.alokasiMenit} Menit)
                    </div>
                    <span
                      className="no-print"
                      style={{
                        fontSize: 11,
                        fontWeight: 700,
                        padding: '2px 8px',
                        borderRadius: 99,
                        background: sessionVal.isValid ? '#dcfce7' : '#fef3c7',
                        color: sessionVal.isValid ? '#166534' : '#92400e',
                      }}
                    >
                      {sessionVal.actualTotalMenit} / {sessionVal.expectedTotalMenit} mnt {sessionVal.isValid ? '✓' : '⚠'}
                    </span>
                  </div>
                  {keg.fokusPertemuan && (
                    <div style={{ fontSize: 12, color: '#475569', fontStyle: 'italic', marginBottom: 8 }}>
                      Fokus Pertemuan: {keg.fokusPertemuan}
                    </div>
                  )}

                  {hasStructured ? (
                    <>
                      {renderPhaseSection('pendahuluan', '1. Kegiatan Pendahuluan:', '#1e40af')}
                      {renderPhaseSection('inti', `2. Kegiatan Inti (${displayDoc.modelPembelajaran || selectedModelDef.label}):`, '#047857')}
                      {renderPhaseSection('penutup', '3. Kegiatan Penutup & Refleksi:', '#b45309')}
                    </>
                  ) : (
                    <>
                      <div style={{ marginBottom: 8 }}>
                        <strong style={{ fontSize: 12.5, color: '#1e40af' }}>1. Kegiatan Pendahuluan:</strong>
                        <ul style={{ margin: '4px 0 0 18px', padding: 0, fontSize: 12.5, color: '#334155' }}>
                          {(keg.pendahuluan || []).map((p, pIdx) => (
                            <li key={pIdx} style={{ marginBottom: 4 }}>
                              <AutoExpandingTextarea
                                value={p}
                                readOnly={isExamplePreview}
                                onChange={(e) => {
                                  if (isExamplePreview) return;
                                  const updatedKegiatan = [...(editableDoc.kegiatanPembelajaran || [])];
                                  const targetKeg = { ...updatedKegiatan[kIdx] };
                                  const newPendahuluan = [...(targetKeg.pendahuluan || [])];
                                  newPendahuluan[pIdx] = e.target.value;
                                  targetKeg.pendahuluan = newPendahuluan;
                                  updatedKegiatan[kIdx] = targetKeg;

                                  const updated = { ...editableDoc, kegiatanPembelajaran: updatedKegiatan };
                                  setEditableDoc(updated);
                                  saveToLocalStorage(updated);
                                }}
                                rows={1}
                                style={{ fontSize: 12.5, color: '#334155' }}
                              />
                            </li>
                          ))}
                        </ul>
                      </div>

                      <div style={{ marginBottom: 8 }}>
                        <strong style={{ fontSize: 12.5, color: '#047857' }}>
                          2. Kegiatan Inti ({displayDoc.modelPembelajaran || 'Model Terpilih'}):
                        </strong>
                        <ul style={{ margin: '4px 0 0 18px', padding: 0, fontSize: 12.5, color: '#334155' }}>
                          {(keg.inti || []).map((it, iIdx) => (
                            <li key={iIdx} style={{ marginBottom: 4 }}>
                              <AutoExpandingTextarea
                                value={it}
                                readOnly={isExamplePreview}
                                onChange={(e) => {
                                  if (isExamplePreview) return;
                                  const updatedKegiatan = [...(editableDoc.kegiatanPembelajaran || [])];
                                  const targetKeg = { ...updatedKegiatan[kIdx] };
                                  const newInti = [...(targetKeg.inti || [])];
                                  newInti[iIdx] = e.target.value;
                                  targetKeg.inti = newInti;
                                  updatedKegiatan[kIdx] = targetKeg;

                                  const updated = { ...editableDoc, kegiatanPembelajaran: updatedKegiatan };
                                  setEditableDoc(updated);
                                  saveToLocalStorage(updated);
                                }}
                                rows={1}
                                style={{ fontSize: 12.5, color: '#334155' }}
                              />
                            </li>
                          ))}
                        </ul>
                      </div>

                      <div>
                        <strong style={{ fontSize: 12.5, color: '#b45309' }}>3. Kegiatan Penutup & Refleksi:</strong>
                        <ul style={{ margin: '4px 0 0 18px', padding: 0, fontSize: 12.5, color: '#334155' }}>
                          {(keg.penutup || []).map((pn, pnIdx) => (
                            <li key={pnIdx} style={{ marginBottom: 4 }}>
                              <AutoExpandingTextarea
                                value={pn}
                                readOnly={isExamplePreview}
                                onChange={(e) => {
                                  if (isExamplePreview) return;
                                  const updatedKegiatan = [...(editableDoc.kegiatanPembelajaran || [])];
                                  const targetKeg = { ...updatedKegiatan[kIdx] };
                                  const newPenutup = [...(targetKeg.penutup || [])];
                                  newPenutup[pnIdx] = e.target.value;
                                  targetKeg.penutup = newPenutup;
                                  updatedKegiatan[kIdx] = targetKeg;

                                  const updated = { ...editableDoc, kegiatanPembelajaran: updatedKegiatan };
                                  setEditableDoc(updated);
                                  saveToLocalStorage(updated);
                                }}
                                rows={1}
                                style={{ fontSize: 12.5, color: '#334155' }}
                              />
                            </li>
                          ))}
                        </ul>
                      </div>
                    </>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* III. ASESMEN & RUBRIK KKTP */}
        <div style={{ marginBottom: 26 }}>
          <h3 style={{ fontSize: 15, fontWeight: 800, color: '#1e3a8a', borderBottom: '2px solid #e2e8f0', paddingBottom: 4, marginBottom: 12 }}>
            III. ASESMEN PEMBELAJARAN & RUBRIK KRITERIA (KKTP)
          </h3>

          <div style={{ fontSize: 12.5, color: '#334155', marginBottom: 12 }}>
            <div style={{ marginBottom: 6 }}>
              <strong>• Asesmen Diagnostik:</strong>
              <AutoExpandingTextarea
                value={displayDoc.asesmen?.diagnostik || ''}
                readOnly={isExamplePreview}
                onChange={(e) => {
                  if (isExamplePreview) return;
                  const updated = {
                    ...editableDoc,
                    asesmen: {
                      ...editableDoc.asesmen,
                      diagnostik: e.target.value,
                    },
                  };
                  setEditableDoc(updated);
                  saveToLocalStorage(updated);
                }}
                rows={1}
                style={{ fontSize: 12.5, color: '#334155', marginTop: 2 }}
              />
            </div>
            <div style={{ marginBottom: 6 }}>
              <strong>• Asesmen Formatif:</strong>
              <AutoExpandingTextarea
                value={displayDoc.asesmen?.formatif || ''}
                readOnly={isExamplePreview}
                onChange={(e) => {
                  if (isExamplePreview) return;
                  const updated = {
                    ...editableDoc,
                    asesmen: {
                      ...editableDoc.asesmen,
                      formatif: e.target.value,
                    },
                  };
                  setEditableDoc(updated);
                  saveToLocalStorage(updated);
                }}
                rows={1}
                style={{ fontSize: 12.5, color: '#334155', marginTop: 2 }}
              />
            </div>
            <div>
              <strong>• Asesmen Sumatif:</strong>
              <AutoExpandingTextarea
                value={displayDoc.asesmen?.sumatif || ''}
                readOnly={isExamplePreview}
                onChange={(e) => {
                  if (isExamplePreview) return;
                  const updated = {
                    ...editableDoc,
                    asesmen: {
                      ...editableDoc.asesmen,
                      sumatif: e.target.value,
                    },
                  };
                  setEditableDoc(updated);
                  saveToLocalStorage(updated);
                }}
                rows={1}
                style={{ fontSize: 12.5, color: '#334155', marginTop: 2 }}
              />
            </div>
          </div>

          {/* Instrumen Asesmen Konkret Terperinci (Task 12.2 Task C) */}
          {displayDoc.asesmenDetail && (
            <div
              data-testid="modul-asesmen-detail"
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: 10,
                marginBottom: 14,
                fontSize: 12,
                color: '#1e293b',
              }}
            >
              <div style={{ background: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: 8, padding: '10px 12px' }}>
                <div style={{ fontWeight: 800, color: '#1e40af', marginBottom: 4, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <ClipboardCheck size={14} /> 1. Instrumen Asesmen Diagnostik Awal
                </div>
                <div style={{ marginBottom: 4 }}>
                  <strong>Tujuan Prasyarat:</strong> {displayDoc.asesmenDetail.diagnostik.tujuanPemeriksaanPrasyarat}
                </div>
                <ul style={{ margin: '2px 0 4px 18px', padding: 0 }}>
                  {displayDoc.asesmenDetail.diagnostik.pertanyaanAtauTugasAwal.map((q, idx) => (
                    <li key={idx} style={{ marginBottom: 2 }}>{q}</li>
                  ))}
                </ul>
                <div style={{ color: '#475569' }}>
                  <strong>Indikator Interpretasi:</strong> {displayDoc.asesmenDetail.diagnostik.indikatorInterpretasi}
                </div>
              </div>

              <div style={{ background: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: 8, padding: '10px 12px' }}>
                <div style={{ fontWeight: 800, color: '#047857', marginBottom: 4 }}>
                  2. Instrumen Asesmen Formatif Proses
                </div>
                <div style={{ marginBottom: 4 }}>
                  <strong>Aktivitas Penilaian:</strong> {displayDoc.asesmenDetail.formatif.instruksiAktivitas}
                </div>
                <div style={{ marginBottom: 4 }}>
                  <strong>Pertanyaan / Cek Proses:</strong>
                  <ul style={{ margin: '2px 0 0 18px', padding: 0 }}>
                    {displayDoc.asesmenDetail.formatif.pertanyaanAtauTugas.map((q, idx) => (
                      <li key={idx}>{q}</li>
                    ))}
                  </ul>
                </div>
                <div style={{ marginBottom: 4 }}>
                  <strong>Bukti Diamati:</strong> {displayDoc.asesmenDetail.formatif.buktiYangDiamati.join('; ')}
                </div>
                <div style={{ color: '#475569' }}>
                  <strong>Umpan Balik Guru:</strong> {displayDoc.asesmenDetail.formatif.umpanBalikGuru}
                </div>
              </div>

              <div style={{ background: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: 8, padding: '10px 12px' }}>
                <div style={{ fontWeight: 800, color: '#7c2d12', marginBottom: 4 }}>
                  3. Instrumen Asesmen Akhir ({displayDoc.asesmenDetail.akhir.bentukUtama})
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 6 }}>
                  {displayDoc.asesmenDetail.akhir.butirTugas.map((bt) => (
                    <div key={bt.nomor} style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: 6, padding: '7px 9px' }}>
                      <div>
                        <strong>Butir {bt.nomor} ({bt.bentuk}):</strong> {bt.pertanyaanAtauTugas}
                      </div>
                      <div style={{ marginTop: 3, color: '#065f46' }}>
                        <strong>Kunci / Contoh Respons:</strong> {bt.kunciAtauContohRespons}
                      </div>
                    </div>
                  ))}
                </div>
                <div>
                  <strong>Pedoman Penilaian:</strong> {displayDoc.asesmenDetail.akhir.pedomanPenilaian}
                </div>
                {displayDoc.asesmenDetail.akhir.kktpReferensi?.catatan && (
                  <div style={{ marginTop: 4, fontSize: 11.5, color: '#1e40af' }}>
                    <strong>Catatan KKTP:</strong> {displayDoc.asesmenDetail.akhir.kktpReferensi.catatan}
                  </div>
                )}
              </div>
            </div>
          )}

          {displayDoc.rubrikPenilaianSingkat && displayDoc.rubrikPenilaianSingkat.length > 0 && (
            <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', minWidth: 560, borderCollapse: 'collapse', fontSize: 12 }}>
              <thead>
                <tr style={{ background: '#1e3a8a', color: '#ffffff', textAlign: 'left' }}>
                  <th style={{ padding: '8px', border: '1px solid #cbd5e1', width: '25%' }}>Kriteria Penilaian</th>
                  <th style={{ padding: '8px', border: '1px solid #cbd5e1', width: '18%', background: '#b91c1c' }}>
                    {displayDoc.asesmenDetail?.akhir?.kktpReferensi?.rentangLabel?.baruBerkembang ||
                      kktpDisplay.rentangLabel?.baruBerkembang ||
                      'Baru Berkembang'}
                  </th>
                  <th style={{ padding: '8px', border: '1px solid #cbd5e1', width: '18%', background: '#b45309' }}>
                    {displayDoc.asesmenDetail?.akhir?.kktpReferensi?.rentangLabel?.layak ||
                      kktpDisplay.rentangLabel?.layak ||
                      'Layak'}
                  </th>
                  <th style={{ padding: '8px', border: '1px solid #cbd5e1', width: '18%', background: '#1d4ed8' }}>
                    {displayDoc.asesmenDetail?.akhir?.kktpReferensi?.rentangLabel?.cakap ||
                      kktpDisplay.rentangLabel?.cakap ||
                      'Cakap'}
                  </th>
                  <th style={{ padding: '8px', border: '1px solid #cbd5e1', width: '21%', background: '#047857' }}>
                    {displayDoc.asesmenDetail?.akhir?.kktpReferensi?.rentangLabel?.mahir ||
                      kktpDisplay.rentangLabel?.mahir ||
                      'Mahir'}
                  </th>
                </tr>
              </thead>
              <tbody>
                {displayDoc.rubrikPenilaianSingkat.map((r, i) => (
                  <tr key={i}>
                    <td style={{ padding: '4px', border: '1px solid #cbd5e1' }}>
                      <AutoExpandingTextarea
                        value={r.kriteria}
                        readOnly={isExamplePreview}
                        onChange={(e) => {
                          if (isExamplePreview) return;
                          const list = [...(editableDoc.rubrikPenilaianSingkat || [])];
                          list[i] = { ...list[i], kriteria: e.target.value };
                          const updated = { ...editableDoc, rubrikPenilaianSingkat: list };
                          setEditableDoc(updated);
                          saveToLocalStorage(updated);
                        }}
                        rows={1}
                        style={{ fontWeight: 700, fontSize: 12 }}
                      />
                    </td>
                    <td style={{ padding: '4px', border: '1px solid #cbd5e1' }}>
                      <AutoExpandingTextarea
                        value={r.baruBerkembang}
                        readOnly={isExamplePreview}
                        onChange={(e) => {
                          if (isExamplePreview) return;
                          const list = [...(editableDoc.rubrikPenilaianSingkat || [])];
                          list[i] = { ...list[i], baruBerkembang: e.target.value };
                          const updated = { ...editableDoc, rubrikPenilaianSingkat: list };
                          setEditableDoc(updated);
                          saveToLocalStorage(updated);
                        }}
                        rows={1}
                        style={{ fontSize: 11.5 }}
                      />
                    </td>
                    <td style={{ padding: '4px', border: '1px solid #cbd5e1' }}>
                      <AutoExpandingTextarea
                        value={r.layak}
                        readOnly={isExamplePreview}
                        onChange={(e) => {
                          if (isExamplePreview) return;
                          const list = [...(editableDoc.rubrikPenilaianSingkat || [])];
                          list[i] = { ...list[i], layak: e.target.value };
                          const updated = { ...editableDoc, rubrikPenilaianSingkat: list };
                          setEditableDoc(updated);
                          saveToLocalStorage(updated);
                        }}
                        rows={1}
                        style={{ fontSize: 11.5 }}
                      />
                    </td>
                    <td style={{ padding: '4px', border: '1px solid #cbd5e1' }}>
                      <AutoExpandingTextarea
                        value={r.cakap}
                        readOnly={isExamplePreview}
                        onChange={(e) => {
                          if (isExamplePreview) return;
                          const list = [...(editableDoc.rubrikPenilaianSingkat || [])];
                          list[i] = { ...list[i], cakap: e.target.value };
                          const updated = { ...editableDoc, rubrikPenilaianSingkat: list };
                          setEditableDoc(updated);
                          saveToLocalStorage(updated);
                        }}
                        rows={1}
                        style={{ fontSize: 11.5 }}
                      />
                    </td>
                    <td style={{ padding: '4px', border: '1px solid #cbd5e1' }}>
                      <AutoExpandingTextarea
                        value={r.mahir}
                        readOnly={isExamplePreview}
                        onChange={(e) => {
                          if (isExamplePreview) return;
                          const list = [...(editableDoc.rubrikPenilaianSingkat || [])];
                          list[i] = { ...list[i], mahir: e.target.value };
                          const updated = { ...editableDoc, rubrikPenilaianSingkat: list };
                          setEditableDoc(updated);
                          saveToLocalStorage(updated);
                        }}
                        rows={1}
                        style={{ fontSize: 11.5 }}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            </div>
          )}
        </div>

        {/* IV. LAMPIRAN & REFERENSI */}
        <div style={{ marginBottom: 26 }}>
          <h3 style={{ fontSize: 15, fontWeight: 800, color: '#1e3a8a', borderBottom: '2px solid #e2e8f0', paddingBottom: 4, marginBottom: 12 }}>
            IV. LAMPIRAN, DIFERENSIASI &amp; REFERENSI
          </h3>
          <div style={{ fontSize: 12.5, color: '#334155' }}>
            {displayDoc.diferensiasiOperasional && (
              <div data-testid="modul-diferensiasi-operasional" style={{ marginBottom: 14 }}>
                <strong style={{ color: '#0f172a' }}>A1. Diferensiasi Operasional Lintas Kesiapan (Menuju TP Sama):</strong>
                <div style={{ fontSize: 12, color: '#475569', marginTop: 2, marginBottom: 8 }}>
                  {displayDoc.diferensiasiOperasional.prinsipKesetaraanTP}
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))', gap: 10 }}>
                  {[
                    {
                      title: 'Jalur A — Kesiapan Dasar',
                      bg: '#fff7ed',
                      border: '#fed7aa',
                      accent: '#9a3412',
                      data: displayDoc.diferensiasiOperasional.kesiapanDasar,
                    },
                    {
                      title: 'Jalur B — Kesiapan Berkembang',
                      bg: '#eff6ff',
                      border: '#bfdbfe',
                      accent: '#1e40af',
                      data: displayDoc.diferensiasiOperasional.kesiapanBerkembang,
                    },
                    {
                      title: 'Jalur C — Kesiapan Mahir',
                      bg: '#ecfdf5',
                      border: '#a7f3d0',
                      accent: '#065f46',
                      data: displayDoc.diferensiasiOperasional.kesiapanMahir,
                    },
                  ].map((tier) => (
                    <div
                      key={tier.title}
                      style={{
                        background: tier.bg,
                        border: `1px solid ${tier.border}`,
                        borderRadius: 8,
                        padding: '10px 12px',
                        fontSize: 12,
                      }}
                    >
                      <div style={{ fontWeight: 800, color: tier.accent, marginBottom: 4 }}>{tier.title}</div>
                      <div style={{ marginBottom: 4 }}>
                        <strong>Sasaran:</strong> {tier.data.targetKesiapan}
                      </div>
                      <div style={{ marginBottom: 4 }}>
                        <strong>Scaffolding / Bantuan:</strong> {tier.data.dukunganScaffolding}
                      </div>
                      <div style={{ marginBottom: 4 }}>
                        <strong>Aktivitas &amp; Tugas Konkret:</strong>
                        <ul style={{ margin: '2px 0 0 16px', padding: 0 }}>
                          {tier.data.aktivitasKonkret.map((ak, aIdx) => (
                            <li key={aIdx} style={{ marginBottom: 2 }}>{ak}</li>
                          ))}
                        </ul>
                      </div>
                      <div style={{ fontSize: 11.5, color: '#334155', marginBottom: 2 }}>
                        <strong>Media:</strong> {tier.data.mediaPendukung}
                      </div>
                      <div style={{ fontSize: 11.5, color: '#334155' }}>
                        <strong>Bukti Belajar:</strong> {tier.data.buktiBelajarJalur}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {displayDoc.contohLKPD && (
              <div
                data-testid="modul-contoh-lkpd"
                style={{
                  marginBottom: 14,
                  background: '#f8fafc',
                  border: '1px solid #cbd5e1',
                  borderRadius: 10,
                  padding: '12px 14px',
                  fontSize: 12,
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8, marginBottom: 6 }}>
                  <div style={{ fontWeight: 800, color: '#0f172a', fontSize: 13 }}>
                    Contoh LKPD Terintegrasi ({displayDoc.contohLKPD.presetType.toUpperCase()}): {displayDoc.contohLKPD.judul}
                  </div>
                  {onOpenLKPDStudio && (
                    <button
                      type="button"
                      className="no-print btn btn-sm btn-primary"
                      onClick={() =>
                        onOpenLKPDStudio(previewingExample ? previewingExample.tp : effectiveTP, {
                          preset: displayDoc.contohLKPD?.presetType,
                          konteks: isExamplePreview ? undefined : konteksInput.trim() || undefined,
                        })
                      }
                      style={{ fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: 5 }}
                    >
                      <ExternalLink size={13} /> Buka &amp; Lanjutkan di LKPD Studio
                    </button>
                  )}
                </div>
                {!isExamplePreview && linkedLKPDStudioDraft && (
                  <div className="no-print" style={{ fontSize: 11.5, color: '#047857', marginBottom: 6, fontWeight: 600 }}>
                    ✓ Tersinkron dengan draf aktif LKPD Studio ({linkedLKPDStudioDraft.doc.judul}) untuk TP {effectiveTP.kode}.
                  </div>
                )}
                <div style={{ marginBottom: 4 }}>
                  <strong>Tujuan Pengerjaan:</strong> {displayDoc.contohLKPD.tujuanPengerjaan}
                </div>
                <div style={{ marginBottom: 4 }}>
                  <strong>Konteks / Stimulus Tugas:</strong> {displayDoc.contohLKPD.konteksTugas}
                </div>
                <div style={{ marginBottom: 4 }}>
                  <strong>Petunjuk Siswa:</strong> {displayDoc.contohLKPD.petunjukSiswa.join(' · ')}
                </div>
                <div style={{ marginBottom: 4 }}>
                  <strong>Bahan / Data yang Diperlukan:</strong> {displayDoc.contohLKPD.bahanAtauData.join('; ')}
                </div>
                <div style={{ marginBottom: 4 }}>
                  <strong>Langkah Pengerjaan:</strong>
                  <ol style={{ margin: '2px 0 0 18px', padding: 0 }}>
                    {displayDoc.contohLKPD.langkahPengerjaan.map((lk, lIdx) => (
                      <li key={lIdx} style={{ marginBottom: 2 }}>{lk}</li>
                    ))}
                  </ol>
                </div>
                <div style={{ marginBottom: 4 }}>
                  <strong>Pertanyaan / Ruang Kerja Inti:</strong>
                  <ul style={{ margin: '2px 0 0 18px', padding: 0 }}>
                    {displayDoc.contohLKPD.pertanyaanAtauRuangKerja.map((pq, pIdx) => (
                      <li key={pIdx} style={{ marginBottom: 2 }}>{pq}</li>
                    ))}
                  </ul>
                </div>
                <div style={{ marginBottom: 3 }}>
                  <strong>Hasil yang Diharapkan:</strong> {displayDoc.contohLKPD.hasilYangDiharapkan}
                </div>
                <div>
                  <strong>Kriteria Penilaian:</strong> {displayDoc.contohLKPD.kriteriaPenilaian.join('; ')}
                </div>
              </div>
            )}

            <div style={{ marginBottom: 6 }}>
              <strong>A. Pengayaan & Remedial:</strong>
              <div style={{ paddingLeft: 12, marginTop: 2 }}>• Pengayaan: {displayDoc.pengayaanDanRemedial?.pengayaan}</div>
              <div style={{ paddingLeft: 12, marginTop: 2 }}>• Remedial: {displayDoc.pengayaanDanRemedial?.remedial}</div>
            </div>
            <div style={{ marginBottom: 6 }}>
              <strong>B. Glosarium:</strong>
              {(displayDoc.glosarium || []).map((g, i) => (
                <div key={i} style={{ paddingLeft: 12, marginTop: 2 }}>
                  • <strong>{g.istilah}:</strong> {g.definisi}
                </div>
              ))}
            </div>
            <div data-testid="modul-sumber-ajar-doc" style={{ overflowWrap: 'anywhere', wordBreak: 'break-word' }}>
              <strong>C. Referensi Sumber Ajar &amp; Daftar Pustaka:</strong>
              {displayDoc.referensiSumber && displayDoc.referensiSumber.length > 0 ? (
                <div style={{ paddingLeft: 12, marginTop: 4 }}>
                  {displayDoc.referensiSumber.map((ref) => (
                    <div
                      key={ref.id}
                      style={{
                        marginBottom: 6,
                        padding: '6px 8px',
                        background: '#f8fafc',
                        borderRadius: 6,
                        border: '1px solid #e2e8f0',
                        fontSize: 11.5,
                      }}
                    >
                      <div>
                        • <strong>[{JENIS_REFERENSI_LABELS[ref.jenisSumber]}]</strong> {ref.judulBuku}
                      </div>
                      <div style={{ color: '#475569', paddingLeft: 10 }}>
                        {[
                          ref.penulis ? `Penulis: ${ref.penulis}` : null,
                          ref.edisiAtauTahun ? `Edisi/Tahun: ${ref.edisiAtauTahun}` : null,
                          ref.babAtauSubbab ? `Bab/Subbab: ${ref.babAtauSubbab}` : null,
                          ref.halaman ? `Halaman: ${ref.halaman}` : null,
                        ]
                          .filter(Boolean)
                          .join(' | ')}
                      </div>
                      {ref.urlSumber && (
                        <div style={{ paddingLeft: 10, color: '#0f766e' }}>Tautan: {ref.urlSumber}</div>
                      )}
                      <div style={{ paddingLeft: 10, color: '#64748b', fontStyle: 'italic' }}>
                        Status: {getReferensiStatusLabel(ref.statusVerifikasi)}
                      </div>
                    </div>
                  ))}
                  {(displayDoc.daftarPustaka || [])
                    .filter(
                      (dp) =>
                        !/^\s*\[Lengkapi referensi satuan pendidikan\]/i.test(dp) &&
                        !displayDoc.referensiSumber?.some((r) => dp.includes(r.judulBuku))
                    )
                    .map((dp, i) => (
                      <div key={i} style={{ marginTop: 2 }}>• {dp}</div>
                    ))}
                </div>
              ) : (
                <div>
                  <div style={{ paddingLeft: 12, marginTop: 2, fontStyle: 'italic', color: '#475569' }}>
                    {PROVENANCE_MSG_UNLINKED}
                  </div>
                  {(displayDoc.daftarPustaka || []).map((dp, i) => (
                    <div key={i} style={{ paddingLeft: 12, marginTop: 2 }}>• {dp}</div>
                  ))}
                </div>
              )}
            </div>
            {(displayDoc.refleksiGuru?.length || displayDoc.refleksiSiswa?.length) ? (
              <div style={{ marginTop: 10, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 10 }}>
                {displayDoc.refleksiGuru && displayDoc.refleksiGuru.length > 0 && (
                  <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 8, padding: '8px 12px' }}>
                    <strong>D. Refleksi Guru:</strong>
                    <ul style={{ margin: '4px 0 0 16px', padding: 0 }}>
                      {displayDoc.refleksiGuru.map((rg, idx) => (
                        <li key={idx} style={{ marginBottom: 4 }}>
                          <AutoExpandingTextarea
                            value={rg}
                            readOnly={isExamplePreview}
                            onChange={(e) => {
                              if (isExamplePreview) return;
                              const list = [...(editableDoc.refleksiGuru || [])];
                              list[idx] = e.target.value;
                              const updated = { ...editableDoc, refleksiGuru: list };
                              setEditableDoc(updated);
                              saveToLocalStorage(updated);
                            }}
                            rows={1}
                            style={{ fontSize: 12, color: '#334155' }}
                          />
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {displayDoc.refleksiSiswa && displayDoc.refleksiSiswa.length > 0 && (
                  <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 8, padding: '8px 12px' }}>
                    <strong>E. Refleksi Peserta Didik:</strong>
                    <ul style={{ margin: '4px 0 0 16px', padding: 0 }}>
                      {displayDoc.refleksiSiswa.map((rs, idx) => (
                        <li key={idx} style={{ marginBottom: 4 }}>
                          <AutoExpandingTextarea
                            value={rs}
                            readOnly={isExamplePreview}
                            onChange={(e) => {
                              if (isExamplePreview) return;
                              const list = [...(editableDoc.refleksiSiswa || [])];
                              list[idx] = e.target.value;
                              const updated = { ...editableDoc, refleksiSiswa: list };
                              setEditableDoc(updated);
                              saveToLocalStorage(updated);
                            }}
                            rows={1}
                            style={{ fontSize: 12, color: '#334155' }}
                          />
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            ) : null}
          </div>
        </div>

        {/* Blok Pengesahan Tanda Tangan */}
        {sheetProfile.tampilkanTandaTangan && (
          <div
            style={{
              marginTop: 36,
              paddingTop: 16,
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
              gap: 24,
              textAlign: 'center',
              fontSize: 12,
              color: '#1e293b',
              pageBreakInside: 'avoid',
            }}
          >
            <div>
              <div>Mengetahui,</div>
              <div style={{ marginBottom: 54 }}>Kepala Sekolah / Madrasah</div>
              <div style={{ fontWeight: 700, textDecoration: 'underline' }}>
                {sheetProfile.namaKepalaSekolah || '......................................................'}
              </div>
              <div style={{ fontSize: 11, color: '#475569' }}>
                {sheetProfile.nipKepalaSekolah ? `NIP. ${sheetProfile.nipKepalaSekolah}` : 'NIP. -'}
              </div>
            </div>
            <div>
              <div>
                {sheetProfile.kotaSekolah || 'Indonesia'}, {displayDoc.createdAt || modul.createdAt}
              </div>
              <div style={{ marginBottom: 54 }}>Guru Mata Pelajaran</div>
              <div style={{ fontWeight: 700, textDecoration: 'underline' }}>
                {displayDoc.namaGuru || sheetProfile.namaGuru || '......................................................'}
              </div>
              <div style={{ fontSize: 11, color: '#475569' }}>
                {sheetProfile.nipGuru ? `NIP. ${sheetProfile.nipGuru}` : 'NIP. -'}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
