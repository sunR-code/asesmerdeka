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
} from '../utils/schoolProfileStorage';
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
} from '../utils/kelasHarianStorage';
import type { KelasHarianData } from '../types/kelasHarian';

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
}

export const ClassSemesterHub: React.FC<ClassSemesterHubProps> = ({
  schoolProfile,
  onUpdateProfile,
  onOpenSchoolModal,
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
  onOpenClassModal,
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
    schoolProfile.semester
  );

  const [tpList, setTpList] = useState<CustomTPItem[]>(defaultPlan.tpList);

  const [kelasHarian, setKelasHarian] = useState<KelasHarianData>(() =>
    getKelasHarianData(schoolProfile, defaultPlan.tpList)
  );

  useEffect(() => {
    setIsClassConfirmed(initialConfirmed);
  }, [initialConfirmed]);

  useEffect(() => {
    const savedCustom = getSavedCustomTPList(
      schoolProfile.mataPelajaranUtama,
      schoolProfile.kelasUtama,
      schoolProfile.semester
    );
    if (savedCustom && savedCustom.length > 0) {
      setTpList(savedCustom);
      setIsCustomTP(true);
    } else {
      const plan = getSemesterCurriculumPlan(
        schoolProfile.mataPelajaranUtama,
        jenjangToDefaultFase(schoolProfile.jenjang, schoolProfile.kelasUtama),
        schoolProfile.kelasUtama,
        schoolProfile.semester
      );
      setTpList(plan.tpList);
      setIsCustomTP(false);
    }
    setEditingTPId(null);
    setDraftTP(null);
  }, [
    schoolProfile.jenjang,
    schoolProfile.kelasUtama,
    schoolProfile.mataPelajaranUtama,
    schoolProfile.semester,
  ]);

  useEffect(() => {
    const data = getKelasHarianData(schoolProfile, tpList);
    setKelasHarian(data);
  }, [schoolProfile, tpList]);

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
    setKelasHarian(updated);
    saveKelasHarianData(schoolProfile, updated);
  };

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
    const nextList = tpList.map((item) => (item.id === draftTP.id ? draftTP : item));
    setTpList(nextList);
    saveCustomTPList(
      schoolProfile.mataPelajaranUtama,
      schoolProfile.kelasUtama,
      schoolProfile.semester,
      nextList
    );
    setIsCustomTP(true);
    setEditingTPId(null);
    setDraftTP(null);
    triggerToast(`Materi Bab/TP ${draftTP.kode} berhasil disimpan.`);
  };

  const handleAddNewTP = () => {
    const nextIdx = tpList.length + 1;
    const isSem2 = schoolProfile.semester.startsWith('2');
    const kodeNomor = isSem2 ? nextIdx + 4 : nextIdx;
    const newTP: CustomTPItem = {
      id: `tp-custom-${Date.now().toString(36)}`,
      kode: `${schoolProfile.kelasUtama}.${kodeNomor}`,
      elemen: 'Pemahaman & Aplikasi Kontekstual',
      materiPokok: `Topik Materi Baru ${nextIdx}`,
      tujuanPembelajaran: `Peserta didik mampu memahami dan menerapkan konsep Topik Materi Baru ${nextIdx} dalam penyelesaian masalah sehari-hari.`,
      arahanRangkuman: `Susun rangkuman konsep inti, rumus/pola utama, contoh nyata, dan latihan pemahaman untuk topik ini.`,
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
      nextList
    );
    setIsCustomTP(true);
    setEditingTPId(newTP.id);
    setDraftTP({ ...newTP });
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
      nextList
    );
    setIsCustomTP(true);
    triggerToast(`TP ${kode} dihapus.`);
  };

  const handleResetDefaultTP = () => {
    resetCustomTPList(
      schoolProfile.mataPelajaranUtama,
      schoolProfile.kelasUtama,
      schoolProfile.semester
    );
    const freshPlan = getSemesterCurriculumPlan(
      schoolProfile.mataPelajaranUtama,
      currentFase,
      schoolProfile.kelasUtama,
      schoolProfile.semester
    );
    setTpList(freshPlan.tpList);
    setIsCustomTP(false);
    setEditingTPId(null);
    triggerToast('Daftar materi dikembalikan ke standar Kurikulum Merdeka.');
  };

  return (
    <div style={{ maxWidth: 980, margin: '24px auto', padding: '0 16px' }}>
      <AnimatePresence>
        {toastMsg && (
          <motion.div
            initial={{ opacity: 0, y: 16, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.96 }}
            transition={{ duration: 0.18 }}
            className="no-print"
            style={{
              position: 'fixed',
              bottom: 24,
              right: 24,
              background: '#059669',
              color: '#ffffff',
              padding: '12px 20px',
              borderRadius: 14,
              boxShadow: '0 10px 25px rgba(5, 150, 105, 0.32)',
              zIndex: 999,
              fontSize: 13,
              fontWeight: 800,
              display: 'flex',
              alignItems: 'center',
              gap: 8,
            }}
          >
            <Check size={16} /> {toastMsg}
          </motion.div>
        )}
      </AnimatePresence>

      {!activeSubTab && (
        <HubStepIndicatorBar
          isClassConfirmed={isClassConfirmed}
          onSetConfirmedState={setConfirmedState}
        />
      )}

      {!isClassConfirmed && (
        <ClassSetupStepView
          schoolProfile={schoolProfile}
          updateAndPersistProfile={updateAndPersistProfile}
          onOpenSchoolModal={onOpenSchoolModal}
          onConfirmClassSetup={handleConfirmClassSetup}
          onToast={triggerToast}
        />
      )}

      {isClassConfirmed && (
        <div>
          {!activeSubTab && (
            <HubActiveClassBanner
              schoolProfile={schoolProfile}
              onSelectRombel={(rombel) => {
                updateAndPersistProfile({ rombelAktif: rombel });
                triggerToast(`Rombel aktif: Kelas ${rombel}`);
              }}
              onChangeClassClick={() => {
                if (onOpenClassModal) {
                  onOpenClassModal();
                } else {
                  setConfirmedState(false);
                }
              }}
            />
          )}

          <div
            className="v21-bento-card"
            style={{
              padding: '24px 26px',
              background: '#ffffff',
            }}
          >
            {!activeSubTab && (
              <HubWorkspaceModeSwitcher
                activeMainMode={activeMainMode}
                perangkatSubTab={perangkatSubTab}
                onSelectMainMode={setActiveMainMode}
                onSelectSubTab={setPerangkatSubTab}
              />
            )}

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
                  editingTPId={editingTPId}
                  draftTP={draftTP}
                  setEditingTPId={setEditingTPId}
                  setDraftTP={setDraftTP}
                  onStartEditTP={handleStartEditTP}
                  onSaveEditTP={handleSaveEditTP}
                  onAddNewTP={handleAddNewTP}
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
                />
              )}

              {perangkatSubTab === 'atp' && (
                <ATPSubTab tpList={tpList} schoolProfile={schoolProfile} onToast={triggerToast} />
              )}

              {perangkatSubTab === 'prota' && (
                <ProtaSubTab tpList={tpList} schoolProfile={schoolProfile} onToast={triggerToast} />
              )}

              {perangkatSubTab === 'promes' && (
                <PromesSubTab tpList={tpList} schoolProfile={schoolProfile} onToast={triggerToast} />
              )}

              {perangkatSubTab === 'presensi' && (
                <div key="presensi">
                  <PresensiTab
                    schoolProfile={schoolProfile}
                    kelasHarian={kelasHarian}
                    tpList={tpList}
                    onUpdateKelasHarian={handleUpdateKelasHarian}
                    onToast={triggerToast}
                  />
                </div>
              )}

              {perangkatSubTab === 'jurnal' && (
                <div key="jurnal">
                  <JurnalMengajarTab
                    schoolProfile={schoolProfile}
                    kelasHarian={kelasHarian}
                    tpList={tpList}
                    onUpdateKelasHarian={handleUpdateKelasHarian}
                    onToast={triggerToast}
                  />
                </div>
              )}

              {perangkatSubTab === 'nilai' && (
                <div key="nilai">
                  <BukuNilaiTab
                    schoolProfile={schoolProfile}
                    kelasHarian={kelasHarian}
                    tpList={tpList}
                    onUpdateKelasHarian={handleUpdateKelasHarian}
                    onToast={triggerToast}
                  />
                </div>
              )}

              {perangkatSubTab === 'rapor' && (
                <div key="rapor">
                  <AutoDeskripsiRaporTab
                    schoolProfile={schoolProfile}
                    kelasHarian={kelasHarian}
                    tpList={tpList}
                    onUpdateKelasHarian={handleUpdateKelasHarian}
                    onToast={triggerToast}
                  />
                </div>
              )}

              {perangkatSubTab === 'supervisi' && (
                <div key="supervisi">
                  <Suspense fallback={<div style={{ padding: 32, textAlign: 'center', color: '#64748b' }}>Memuat Paket Supervisi...</div>}>
                    <PaketSupervisiDashboard
                      schoolProfile={schoolProfile}
                      tpList={tpList}
                      kelasHarian={kelasHarian}
                      onBackToClassHub={() => setPerangkatSubTab('tp_list')}
                      onToast={triggerToast}
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
