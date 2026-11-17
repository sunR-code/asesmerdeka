import React, { useState, useEffect, Suspense } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Check } from 'lucide-react';
import type { SchoolProfile, CustomTPItem } from '../utils/schoolProfileStorage';
import {
  saveSchoolProfile,
  jenjangToDefaultFase,
  getSavedCustomTPList,
  saveCustomTPList,
  resetCustomTPList,
  markSavedLKPDDraftsNeedsReview,
} from '../utils/schoolProfileStorage';
import { createCustomImmutableTPId } from '../utils/storageIdentity';
import {
  getPendingAmbiguousLegacyDrafts,
  getPendingLegacyRosterConflicts,
} from '../utils/storageMigration';
import { MigrationConflictNoticeBanner } from './MigrationConflictNoticeBanner';
import { tabContentVariants } from '../utils/motionPresets';
import { getSemesterCurriculumPlan } from '../utils/kurikulumCatalog';
import { PresensiTab } from './harian/PresensiTab';
import { JurnalMengajarTab } from './harian/JurnalMengajarTab';
import { BukuNilaiTab } from './harian/BukuNilaiTab';
import { AutoDeskripsiRaporTab } from './harian/AutoDeskripsiRaporTab';
import { ClassSetupStepView } from './hub/ClassSetupStepView';

const PaketSupervisiDashboard = React.lazy(() =>
  import('./PaketSupervisiDashboard').then((m) => ({ default: m.PaketSupervisiDashboard }))
);
import { TPListSubTab } from './hub/TPListSubTab';
import { ATPSubTab } from './hub/ATPSubTab';
import { ProtaSubTab } from './hub/ProtaSubTab';
import { PromesSubTab } from './hub/PromesSubTab';
import {
  HubStepIndicatorBar,
  HubActiveClassBanner,
  HubWorkspaceModeSwitcher,
} from './hub/HubStandaloneNavigation';
import {
  getKelasHarianData,
  saveKelasHarianData,
  createSeparateDemoDataset,
  isKelasHarianSimulated,
} from '../utils/kelasHarianStorage';
import { pushWorkspaceToCloud } from '../utils/cloudSyncManager';
import type { KelasHarianData } from '../types/kelasHarian';
import type { LKPDDokumen, ModulAjarDokumen } from '../types/perangkatAjar';

export type PerangkatSubTabType =
  | 'tp_list'
  | 'atp'
  | 'prota'
  | 'promes'
  | 'presensi'
  | 'jurnal'
  | 'nilai'
  | 'rapor'
  | 'supervisi';

interface ClassSemesterHubProps {
  schoolProfile: SchoolProfile;
  onUpdateProfile: (profile: SchoolProfile) => void;
  onOpenSchoolModal: () => void;
  onOpenLicenseModal?: () => void;
  onInstantGenerateAssessment: (tp: CustomTPItem, profile: SchoolProfile) => Promise<void>;
  onInstantGenerateRangkuman: (tp: CustomTPItem, profile: SchoolProfile) => Promise<void>;
  onOpenModulAjar: (tp: CustomTPItem, profile: SchoolProfile) => void;
  onOpenLKPD: (tp: CustomTPItem, profile: SchoolProfile) => void;
  onCustomAssessmentForm: (tp: CustomTPItem, profile: SchoolProfile) => void;
  onCustomRangkumanForm: (tp: CustomTPItem, profile: SchoolProfile) => void;
  isGeneratingAssessment?: boolean;
  isGeneratingRangkuman?: boolean;
  initialConfirmed?: boolean;
  onConfirmChange?: (confirmed: boolean) => void;
  activeSubTab?: PerangkatSubTabType;
  onSelectSubTab?: (tab: PerangkatSubTabType) => void;
  onOpenClassModal?: () => void;
  activeModulAjar?: ModulAjarDokumen | null;
  activeLKPD?: LKPDDokumen | null;
}

export const ClassSemesterHub: React.FC<ClassSemesterHubProps> = ({
  schoolProfile,
  onUpdateProfile,
  onOpenSchoolModal,
  onOpenLicenseModal,
  onInstantGenerateAssessment,
  onInstantGenerateRangkuman,
  onOpenModulAjar,
  onOpenLKPD,
  onCustomAssessmentForm,
  onCustomRangkumanForm,
  isGeneratingAssessment = false,
  isGeneratingRangkuman = false,
  initialConfirmed = false,
  onConfirmChange,
  activeSubTab,
  onSelectSubTab: _onSelectSubTab,
  activeModulAjar,
  activeLKPD,
}) => {
  const [isClassConfirmed, setIsClassConfirmed] = useState<boolean>(initialConfirmed);
  const [activeMainMode, setActiveMainMode] = useState<'persiapan' | 'harian' | 'supervisi'>('persiapan');
  const [perangkatSubTab, setPerangkatSubTab] = useState<PerangkatSubTabType>(activeSubTab || 'tp_list');

  useEffect(() => {
    if (activeSubTab) {
      setPerangkatSubTab(activeSubTab);
    }
  }, [activeSubTab]);

  const [editingTPId, setEditingTPId] = useState<string | null>(null);
  const [draftTP, setDraftTP] = useState<CustomTPItem | null>(null);
  const [isCustomTP, setIsCustomTP] = useState(false);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  const currentFase = jenjangToDefaultFase(schoolProfile.jenjang, schoolProfile.kelasUtama);
  const defaultPlan = getSemesterCurriculumPlan(
    schoolProfile.mataPelajaranUtama,
    currentFase,
    schoolProfile.kelasUtama,
    schoolProfile.semester,
    { schoolId: schoolProfile.schoolId, tahunAjaran: schoolProfile.tahunAjaran }
  );

  const [tpList, setTpList] = useState<CustomTPItem[]>(defaultPlan.tpList);

  const [kelasHarian, setKelasHarian] = useState<KelasHarianData>(() =>
    getKelasHarianData(schoolProfile, defaultPlan.tpList)
  );
  const [demoPreviewData, setDemoPreviewData] = useState<KelasHarianData | null>(null);
  const [migrationRefreshTick, setMigrationRefreshTick] = useState(0);

  useEffect(() => {
    setIsClassConfirmed(initialConfirmed);
  }, [initialConfirmed]);

  useEffect(() => {
    setDemoPreviewData(null);
    const savedCustom = getSavedCustomTPList(
      schoolProfile.mataPelajaranUtama,
      schoolProfile.kelasUtama,
      schoolProfile.semester,
      schoolProfile
    );
    if (savedCustom && savedCustom.length > 0) {
      setTpList(savedCustom);
      setIsCustomTP(true);
    } else {
      const plan = getSemesterCurriculumPlan(
        schoolProfile.mataPelajaranUtama,
        jenjangToDefaultFase(schoolProfile.jenjang, schoolProfile.kelasUtama),
        schoolProfile.kelasUtama,
        schoolProfile.semester,
        { schoolId: schoolProfile.schoolId, tahunAjaran: schoolProfile.tahunAjaran }
      );
      setTpList(plan.tpList);
      setIsCustomTP(false);
    }
    setEditingTPId(null);
    setDraftTP(null);
  }, [
    schoolProfile.schoolId,
    schoolProfile.tahunAjaran,
    schoolProfile.jenjang,
    schoolProfile.kelasUtama,
    schoolProfile.mataPelajaranUtama,
    schoolProfile.semester,
  ]);

  useEffect(() => {
    const data = getKelasHarianData(schoolProfile, tpList);
    setKelasHarian(data);
  }, [schoolProfile, tpList, migrationRefreshTick]);

  useEffect(() => {
    if (['tp_list', 'atp', 'prota', 'promes'].includes(perangkatSubTab)) {
      setActiveMainMode('persiapan');
    } else if (['presensi', 'jurnal', 'nilai', 'rapor'].includes(perangkatSubTab)) {
      setActiveMainMode('harian');
    } else if (perangkatSubTab === 'supervisi') {
      setActiveMainMode('supervisi');
    }
  }, [perangkatSubTab]);

  const handleUpdateKelasHarian = (updated: KelasHarianData) => {
    if (demoPreviewData !== null && isKelasHarianSimulated(updated)) {
      setDemoPreviewData(updated);
      return;
    }
    setDemoPreviewData(null);
    setKelasHarian(updated);
    saveKelasHarianData(schoolProfile, updated);
    pushWorkspaceToCloud().catch(() => {});
  };

  const handleOpenSeparateDemoPreview = () => {
    setDemoPreviewData(createSeparateDemoDataset(schoolProfile, tpList));
  };

  const handleExitDemoPreview = () => {
    setDemoPreviewData(null);
    triggerToast('Kembali ke data kelas asli Anda.');
  };

  const displayedKelasHarian = demoPreviewData ?? kelasHarian;
  const isSeparateDemoPreview = demoPreviewData !== null;

  const triggerToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 2600);
  };

  const setConfirmedState = (val: boolean) => {
    setIsClassConfirmed(val);
    if (onConfirmChange) onConfirmChange(val);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const updateAndPersistProfile = (patch: Partial<SchoolProfile>) => {
    const next: SchoolProfile = {
      ...schoolProfile,
      ...patch,
    };
    saveSchoolProfile(next);
    onUpdateProfile(next);
  };

  const handleConfirmClassSetup = () => {
    setConfirmedState(true);
    triggerToast(
      `Data kelas disimpan! Menampilkan materi ${schoolProfile.mataPelajaranUtama} Kelas ${schoolProfile.rombelAktif}.`
    );
  };

  const handleStartEditTP = (tp: CustomTPItem) => {
    setEditingTPId(tp.id);
    setDraftTP({ ...tp });
  };

  const handleSaveEditTP = () => {
    if (!draftTP) return;
    const normalizedTP: CustomTPItem = {
      ...draftTP,
      statusReview: draftTP.statusReview || 'ditinjau',
    };
    const nextList = tpList.map((item) => (item.id === draftTP.id ? normalizedTP : item));
    setTpList(nextList);
    saveCustomTPList(
      schoolProfile.mataPelajaranUtama,
      schoolProfile.kelasUtama,
      schoolProfile.semester,
      nextList,
      schoolProfile
    );
    const affectedLkpdCount = markSavedLKPDDraftsNeedsReview(
      draftTP.id,
      normalizedTP,
      schoolProfile
    );
    setIsCustomTP(true);
    setEditingTPId(null);
    setDraftTP(null);
    pushWorkspaceToCloud().catch(() => {});
    triggerToast(
      affectedLkpdCount > 0
        ? `TP ${draftTP.kode} disimpan. ${affectedLkpdCount} draf LKPD ditandai perlu tinjau ulang tanpa menimpa editan Anda.`
        : `Materi Bab/TP ${draftTP.kode} berhasil disimpan.`
    );
  };

  const handleToggleReviewTP = (tp: CustomTPItem) => {
    const order: Array<'draft' | 'ditinjau' | 'disetujui'> = ['draft', 'ditinjau', 'disetujui'];
    const currentIdx = order.indexOf(tp.statusReview || 'draft');
    const nextStatus = order[(currentIdx + 1) % order.length];
    const nextList = tpList.map((item) =>
      item.id === tp.id ? { ...item, statusReview: nextStatus } : item
    );
    setTpList(nextList);
    saveCustomTPList(
      schoolProfile.mataPelajaranUtama,
      schoolProfile.kelasUtama,
      schoolProfile.semester,
      nextList,
      schoolProfile
    );
    setIsCustomTP(true);
    triggerToast(
      `Status tinjauan TP ${tp.kode}: ${
        nextStatus === 'disetujui' ? 'Disetujui Guru' : nextStatus === 'ditinjau' ? 'Sudah Ditinjau' : 'Draf Aplikasi'
      }.`
    );
  };

  const handleAddNewTP = () => {
    const nextIdx = tpList.length + 1;
    const isSem2 = schoolProfile.semester.startsWith('2');
    const kodeNomor = isSem2 ? nextIdx + 4 : nextIdx;
    const defaultTopicTitle = `Topik Materi Baru ${nextIdx}`;
    const newTP: CustomTPItem = {
      id: createCustomImmutableTPId(schoolProfile),
      kode: `${schoolProfile.kelasUtama}.${kodeNomor}`,
      elemen: 'Pemahaman & Aplikasi Kontekstual',
      materiPokok: defaultTopicTitle,
      kompetensiInti: `Menjelaskan dan menerapkan konsep ${defaultTopicTitle}`,
      lingkupMateri: defaultTopicTitle,
      tujuanPembelajaran: `Peserta didik mampu menjelaskan dan menerapkan konsep ${defaultTopicTitle} dalam penyelesaian masalah sehari-hari.`,
      arahanRangkuman: `Susun rangkuman konsep inti, rumus/pola utama, contoh nyata, dan latihan pemahaman untuk topik ini.`,
      buktiKetercapaian: [
        `Menguraikan konsep inti ${defaultTopicTitle} dengan contoh nyata yang tepat.`,
      ],
      referensiCP: defaultPlan.referensiCP,
      alokasiJP: 12,
      mingguMulai: Math.min(18, (nextIdx - 1) * 4 + 1),
      mingguSelesai: Math.min(20, nextIdx * 4),
    };
    const nextList = [...tpList, newTP];
    setTpList(nextList);
    saveCustomTPList(
      schoolProfile.mataPelajaranUtama,
      schoolProfile.kelasUtama,
      schoolProfile.semester,
      nextList,
      schoolProfile
    );
    setIsCustomTP(true);
    setEditingTPId(newTP.id);
    setDraftTP({ ...newTP });
  };

  const handleCreateTPFromAnalysis = (newTP: CustomTPItem) => {
    const nextList = [...tpList, newTP];
    setTpList(nextList);
    saveCustomTPList(
      schoolProfile.mataPelajaranUtama,
      schoolProfile.kelasUtama,
      schoolProfile.semester,
      nextList,
      schoolProfile
    );
    setIsCustomTP(true);
    setEditingTPId(newTP.id);
    setDraftTP({ ...newTP });
    pushWorkspaceToCloud().catch(() => {});
    triggerToast(
      `TP ${newTP.kode} dibuat dari hasil Analisis CP. Silakan tinjau kelengkapan lalu klik Simpan.`
    );
  };

  const handleBulkUpdateTPList = (nextList: CustomTPItem[]) => {
    setTpList(nextList);
    saveCustomTPList(
      schoolProfile.mataPelajaranUtama,
      schoolProfile.kelasUtama,
      schoolProfile.semester,
      nextList,
      schoolProfile
    );
    setIsCustomTP(true);
    pushWorkspaceToCloud().catch(() => {});
  };

  const handleDeleteTP = (id: string, kode: string) => {
    if (tpList.length <= 1) {
      alert('Minimal harus terdapat 1 materi/TP dalam daftar semester.');
      return;
    }
    const nextList = tpList.filter((item) => item.id !== id);
    setTpList(nextList);
    saveCustomTPList(
      schoolProfile.mataPelajaranUtama,
      schoolProfile.kelasUtama,
      schoolProfile.semester,
      nextList,
      schoolProfile
    );
    setIsCustomTP(true);
    triggerToast(`TP ${kode} dihapus.`);
  };

  const handleResetDefaultTP = () => {
    resetCustomTPList(
      schoolProfile.mataPelajaranUtama,
      schoolProfile.kelasUtama,
      schoolProfile.semester,
      schoolProfile
    );
    const freshPlan = getSemesterCurriculumPlan(
      schoolProfile.mataPelajaranUtama,
      currentFase,
      schoolProfile.kelasUtama,
      schoolProfile.semester,
      { schoolId: schoolProfile.schoolId, tahunAjaran: schoolProfile.tahunAjaran }
    );
    setTpList(freshPlan.tpList);
    setIsCustomTP(false);
    setEditingTPId(null);
    triggerToast('Daftar materi dikembalikan ke standar Kurikulum Merdeka.');
  };

  const pendingAmbiguousDrafts = getPendingAmbiguousLegacyDrafts();
  const pendingRosterConflicts = getPendingLegacyRosterConflicts();

  return (
    <div style={{ maxWidth: 1080, margin: '4px auto 24px', padding: '0 2px' }}>
      <AnimatePresence>
        {toastMsg && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 6 }}
            transition={{ duration: 0.16 }}
            role="status"
            aria-live="polite"
            className="no-print app-toast-banner"
            style={{
              position: 'fixed',
              bottom: 24,
              right: 24,
              background: '#172033',
              color: '#ffffff',
              padding: '10px 16px',
              borderRadius: 10,
              border: '1px solid #334155',
              boxShadow: '0 8px 20px rgba(23, 32, 51, 0.14)',
              zIndex: 999,
              fontSize: 13,
              fontWeight: 500,
              display: 'flex',
              alignItems: 'center',
              gap: 8,
            }}
          >
            <Check size={15} style={{ color: '#4ade80', flexShrink: 0 }} aria-hidden="true" />
            <span>{toastMsg}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {!isClassConfirmed && (
        <>
          <HubStepIndicatorBar
            isClassConfirmed={isClassConfirmed}
            onSetConfirmedState={setConfirmedState}
          />
          <ClassSetupStepView
            schoolProfile={schoolProfile}
            updateAndPersistProfile={updateAndPersistProfile}
            onOpenSchoolModal={onOpenSchoolModal}
            onOpenLicenseModal={onOpenLicenseModal}
            onConfirmClassSetup={handleConfirmClassSetup}
            onToast={triggerToast}
          />
        </>
      )}

      {isClassConfirmed && (
        <div>
          <HubActiveClassBanner
            schoolProfile={schoolProfile}
            onSelectRombel={(rombel) => {
              updateAndPersistProfile({ rombelAktif: rombel });
              triggerToast(`Rombel aktif: Kelas ${rombel}`);
            }}
            onChangeClassClick={() => {
              setConfirmedState(false);
            }}
          />

          <MigrationConflictNoticeBanner
            schoolProfile={schoolProfile}
            tpList={tpList}
            ambiguousDrafts={pendingAmbiguousDrafts}
            rosterConflicts={pendingRosterConflicts}
            onResolved={() => setMigrationRefreshTick((n) => n + 1)}
            onToast={triggerToast}
          />

          <div
            className="v21-bento-card hub-main-bento-card"
            style={{
              padding: '18px 22px',
              background: '#ffffff',
              borderRadius: 12,
            }}
          >
            <HubWorkspaceModeSwitcher
              activeMainMode={activeMainMode}
              perangkatSubTab={perangkatSubTab}
              onSelectMainMode={setActiveMainMode}
              onSelectSubTab={(tab) => {
                setPerangkatSubTab(tab);
                if (_onSelectSubTab) _onSelectSubTab(tab);
              }}
            />

            <motion.div
              key={perangkatSubTab}
              variants={tabContentVariants}
              initial="initial"
              animate="animate"
            >
              {perangkatSubTab === 'tp_list' && (
                <TPListSubTab
                  schoolProfile={schoolProfile}
                  tpList={tpList}
                  isCustomTP={isCustomTP}
                  currentFase={currentFase}
                  capaianPembelajaran={defaultPlan.capaianPembelajaran}
                  referensiCatatan={defaultPlan.referensiCatatan}
                  defaultReferensiCP={defaultPlan.referensiCP}
                  editingTPId={editingTPId}
                  draftTP={draftTP}
                  setEditingTPId={setEditingTPId}
                  setDraftTP={setDraftTP}
                  onStartEditTP={handleStartEditTP}
                  onSaveEditTP={handleSaveEditTP}
                  onToggleReviewTP={handleToggleReviewTP}
                  onAddNewTP={handleAddNewTP}
                  onCreateTPFromAnalysis={handleCreateTPFromAnalysis}
                  onDeleteTP={handleDeleteTP}
                  onResetDefaultTP={handleResetDefaultTP}
                  onOpenModulAjar={onOpenModulAjar}
                  onOpenLKPD={onOpenLKPD}
                  onInstantGenerateAssessment={onInstantGenerateAssessment}
                  onInstantGenerateRangkuman={onInstantGenerateRangkuman}
                  onCustomAssessmentForm={onCustomAssessmentForm}
                  onCustomRangkumanForm={onCustomRangkumanForm}
                  isGeneratingAssessment={isGeneratingAssessment}
                  isGeneratingRangkuman={isGeneratingRangkuman}
                  onToast={triggerToast}
                />
              )}

              {perangkatSubTab === 'atp' && (
                <ATPSubTab
                  tpList={tpList}
                  schoolProfile={schoolProfile}
                  onUpdateTPList={handleBulkUpdateTPList}
                  onToast={triggerToast}
                />
              )}

              {perangkatSubTab === 'prota' && (
                <ProtaSubTab
                  tpList={tpList}
                  schoolProfile={schoolProfile}
                  onUpdateTPList={handleBulkUpdateTPList}
                  onToast={triggerToast}
                />
              )}

              {perangkatSubTab === 'promes' && (
                <PromesSubTab
                  tpList={tpList}
                  schoolProfile={schoolProfile}
                  onUpdateTPList={handleBulkUpdateTPList}
                  onToast={triggerToast}
                />
              )}

              {perangkatSubTab === 'presensi' && (
                <div key="presensi">
                  <PresensiTab
                    schoolProfile={schoolProfile}
                    kelasHarian={displayedKelasHarian}
                    tpList={tpList}
                    onUpdateKelasHarian={handleUpdateKelasHarian}
                    onToast={triggerToast}
                    isSeparateDemoPreview={isSeparateDemoPreview}
                    onOpenSeparateDemoPreview={handleOpenSeparateDemoPreview}
                    onExitDemoPreview={handleExitDemoPreview}
                  />
                </div>
              )}

              {perangkatSubTab === 'jurnal' && (
                <div key="jurnal">
                  <JurnalMengajarTab
                    schoolProfile={schoolProfile}
                    kelasHarian={displayedKelasHarian}
                    tpList={tpList}
                    onUpdateKelasHarian={handleUpdateKelasHarian}
                    onToast={triggerToast}
                    isSeparateDemoPreview={isSeparateDemoPreview}
                    onOpenSeparateDemoPreview={handleOpenSeparateDemoPreview}
                    onExitDemoPreview={handleExitDemoPreview}
                  />
                </div>
              )}

              {perangkatSubTab === 'nilai' && (
                <div key="nilai">
                  <BukuNilaiTab
                    schoolProfile={schoolProfile}
                    kelasHarian={displayedKelasHarian}
                    tpList={tpList}
                    onUpdateKelasHarian={handleUpdateKelasHarian}
                    onToast={triggerToast}
                    isSeparateDemoPreview={isSeparateDemoPreview}
                    onOpenSeparateDemoPreview={handleOpenSeparateDemoPreview}
                    onExitDemoPreview={handleExitDemoPreview}
                  />
                </div>
              )}

              {perangkatSubTab === 'rapor' && (
                <div key="rapor">
                  <AutoDeskripsiRaporTab
                    schoolProfile={schoolProfile}
                    kelasHarian={displayedKelasHarian}
                    tpList={tpList}
                    onUpdateKelasHarian={handleUpdateKelasHarian}
                    onToast={triggerToast}
                    isSeparateDemoPreview={isSeparateDemoPreview}
                    onOpenSeparateDemoPreview={handleOpenSeparateDemoPreview}
                    onExitDemoPreview={handleExitDemoPreview}
                  />
                </div>
              )}

              {perangkatSubTab === 'supervisi' && (
                <div key="supervisi">
                  <Suspense fallback={<div style={{ padding: 32, textAlign: 'center', color: '#64748b' }}>Memuat Paket Supervisi...</div>}>
                    <PaketSupervisiDashboard
                      schoolProfile={schoolProfile}
                      tpList={tpList}
                      kelasHarian={displayedKelasHarian}
                      onBackToClassHub={() => setPerangkatSubTab('tp_list')}
                      onToast={triggerToast}
                      activeModulAjar={activeModulAjar}
                      activeLKPD={activeLKPD}
                    />
                  </Suspense>
                </div>
              )}
            </motion.div>
          </div>
        </div>
      )}
    </div>
  );
};
