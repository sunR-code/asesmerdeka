import { useState, useEffect, lazy, Suspense } from 'react';
import { AppSidebar } from './components/layout/AppSidebar';
import type { SidebarTabId } from './components/layout/AppSidebar';
import { TopHeader } from './components/layout/TopHeader';
import { ClassSelectorModal } from './components/layout/ClassSelectorModal';
import { getTabHeaderInfo } from './components/layout/headerMetadata';
import {
  AppErrorBanner,
  BackToHubButton,
  AppFooter,
  FloatingProPromoBar,
  AppToastBanner,
  MobileBottomNav,
} from './components/layout/AppChrome';
import { ClassSemesterHub } from './components/ClassSemesterHub';
import { LicenseModal } from './components/LicenseModal';
import { SchoolProfileModal } from './components/SchoolProfileModal';
import type { AsesmenDokumen, GenerationRequest, UserQuota } from './types/assessment';
import type { RangkumanDokumen, RangkumanRequest } from './types/summary';
import type { ModulAjarDokumen, LKPDDokumen } from './types/perangkatAjar';
import {
  getUserQuota,
  deductQuota,
  refundQuota,
  isLicensed,
  verifyMayarLicenseOnline,
  revokeLicenseToPreviewMode,
} from './utils/licenseManager';
import { generateAsesmen, generateRangkumanMateri } from './services/aiGenerator';
import { getBankSoal, saveToBankSoal, deleteFromBankSoal } from './utils/bankSoalStorage';
import { saveToBankRangkuman } from './utils/bankRangkumanStorage';
import {
  loadAndUpgradeBankSoal,
  loadOrInitRangkuman,
  createDefaultInitialAssessment,
} from './utils/storageInitializer';
import { buildSmartModulAjar, buildSmartLKPD } from './utils/perangkatAjarEngine';
import {
  getSchoolProfile,
  jenjangToDefaultFase,
  getSavedCustomTPList,
  hasConfirmedClassSetup,
  setConfirmedClassSetup,
} from './utils/schoolProfileStorage';
import type { SchoolProfile, CustomTPItem } from './utils/schoolProfileStorage';
import { getKelasHarianData } from './utils/kelasHarianStorage';
import { getSemesterCurriculumPlan } from './utils/kurikulumCatalog';
import { pushWorkspaceToCloud } from './utils/cloudSyncManager';

const GeneratorForm = lazy(() =>
  import('./components/GeneratorForm').then((m) => ({ default: m.GeneratorForm }))
);
const AssessmentViewer = lazy(() =>
  import('./components/AssessmentViewer').then((m) => ({ default: m.AssessmentViewer }))
);
const BankSoalView = lazy(() =>
  import('./components/BankSoalView').then((m) => ({ default: m.BankSoalView }))
);
const RangkumanGenerator = lazy(() =>
  import('./components/RangkumanGenerator').then((m) => ({ default: m.RangkumanGenerator }))
);
const RangkumanViewer = lazy(() =>
  import('./components/RangkumanViewer').then((m) => ({ default: m.RangkumanViewer }))
);
const ModulAjarViewer = lazy(() =>
  import('./components/ModulAjarViewer').then((m) => ({ default: m.ModulAjarViewer }))
);
const LKPDViewer = lazy(() =>
  import('./components/LKPDViewer').then((m) => ({ default: m.LKPDViewer }))
);
const PaketSupervisiDashboard = lazy(() =>
  import('./components/PaketSupervisiDashboard').then((m) => ({ default: m.PaketSupervisiDashboard }))
);
const NaskahUjianSemesterView = lazy(() =>
  import('./components/ujian/NaskahUjianSemesterView').then((m) => ({ default: m.NaskahUjianSemesterView }))
);
const P5ProjectView = lazy(() =>
  import('./components/p5/P5ProjectView').then((m) => ({ default: m.P5ProjectView }))
);

export type AppTab =
  | 'tp_list'
  | 'atp'
  | 'prota'
  | 'promes'
  | 'presensi'
  | 'jurnal'
  | 'nilai'
  | 'rapor'
  | 'supervisi'
  | 'bank'
  | 'ujian_semester'
  | 'p5_project'
  | 'generator'
  | 'worksheet'
  | 'kisi_kisi'
  | 'teacher_guide'
  | 'rangkuman_gen'
  | 'rangkuman_view'
  | 'modul_ajar'
  | 'lkpd';

export function App() {
  const [activeTab, setActiveTab] = useState<AppTab>('tp_list');
  const [bankList, setBankList] = useState<AsesmenDokumen[]>(() => loadAndUpgradeBankSoal());
  const [currentAssessment, setCurrentAssessment] = useState<AsesmenDokumen | null>(() => {
    const initial = loadAndUpgradeBankSoal();
    return initial[0] || null;
  });
  const [currentRangkuman, setCurrentRangkuman] = useState<RangkumanDokumen | null>(() =>
    loadOrInitRangkuman()
  );
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingRangkuman, setIsLoadingRangkuman] = useState(false);
  const [quota, setQuota] = useState<UserQuota>(() => getUserQuota());
  const [schoolProfile, setSchoolProfile] = useState<SchoolProfile>(() => getSchoolProfile());
  const [isClassConfirmed, setIsClassConfirmed] = useState<boolean>(() => hasConfirmedClassSetup());
  const [isLicenseModalOpen, setIsLicenseModalOpen] = useState(false);
  const [isSchoolModalOpen, setIsSchoolModalOpen] = useState(false);
  const [isClassModalOpen, setIsClassModalOpen] = useState(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [prefillAssessment, setPrefillAssessment] = useState<Partial<GenerationRequest> | null>(null);
  const [prefillRangkuman, setPrefillRangkuman] = useState<Partial<RangkumanRequest> | null>(null);
  const [currentModulAjar, setCurrentModulAjar] = useState<ModulAjarDokumen | null>(null);
  const [currentLKPD, setCurrentLKPD] = useState<LKPDDokumen | null>(null);
  const [activeLKPDTP, setActiveLKPDTP] = useState<CustomTPItem | null>(null);
  const [dismissPromoBar, setDismissPromoBar] = useState(false);
  const [appToast, setAppToast] = useState<string | null>(null);

  const triggerAppToast = (msg: string) => {
    setAppToast(msg);
    setTimeout(() => setAppToast(null), 3000);
  };

  const activeFase = jenjangToDefaultFase(schoolProfile.jenjang, schoolProfile.kelasUtama);
  const activePlan = getSemesterCurriculumPlan(
    schoolProfile.mataPelajaranUtama,
    activeFase,
    schoolProfile.kelasUtama,
    schoolProfile.semester
  );
  const savedTPList = getSavedCustomTPList(
    schoolProfile.mataPelajaranUtama,
    schoolProfile.kelasUtama,
    schoolProfile.semester
  );
  const activeTPList: CustomTPItem[] =
    savedTPList && savedTPList.length > 0 ? savedTPList : activePlan.tpList;
  const activeKelasHarian = getKelasHarianData(schoolProfile, activeTPList);

  useEffect(() => {
    const handleFocus = () => setQuota(getUserQuota());
    const handleRequireLicense = (e: Event) => {
      const customEvt = e as CustomEvent<{ message?: string }>;
      setErrorMessage(
        customEvt.detail?.message ||
          'Mode Pratinjau: Silakan aktifkan Kode Lisensi Guru Mandiri atau Lisensi Sekolah terlebih dahulu.'
      );
      setIsLicenseModalOpen(true);
    };

    window.addEventListener('focus', handleFocus);
    window.addEventListener('asesmerdeka:require-license', handleRequireLicense);

    if (bankList.length === 0) {
      createDefaultInitialAssessment(schoolProfile).then((doc) => {
        setCurrentAssessment(doc);
        setBankList([doc]);
      });
    }

    return () => {
      window.removeEventListener('focus', handleFocus);
      window.removeEventListener('asesmerdeka:require-license', handleRequireLicense);
    };
  }, [bankList.length, schoolProfile]);

  const syncProfileUpdate = (newProf: SchoolProfile) => {
    setSchoolProfile(newProf);
    if (currentAssessment) {
      setCurrentAssessment({
        ...currentAssessment,
        namaSekolah: newProf.namaSekolah,
        namaPenyusun: newProf.namaGuru,
        tahunAjaran: newProf.tahunAjaran,
      });
    }
  };

  const handleConfirmClassChange = (confirmed: boolean) => {
    setIsClassConfirmed(confirmed);
    setConfirmedClassSetup(confirmed);
  };

  // Verifikasi kursi perangkat aktif ke Cloud Redis saat aplikasi dibuka:
  // Jika perangkat ke-3 mencoba memakai lisensi yang sudah penuh (2/2), otomatis nonaktifkan ke Mode Pratinjau
  useEffect(() => {
    if (!isLicensed(quota.tier) || !quota.licenseKey) return;
    let active = true;
    verifyMayarLicenseOnline(quota.licenseKey, quota.deviceId)
      .then((res) => {
        if (!active) return;
        if (res.seatLimitExceeded) {
          const revoked = revokeLicenseToPreviewMode();
          setQuota(revoked);
          setErrorMessage(
            res.message ||
              'Lisensi dinonaktifkan pada perangkat ini karena telah mencapai batas maksimal perangkat (1 Laptop + 1 HP pemilik utama).'
          );
          setIsLicenseModalOpen(true);
        }
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [quota.tier, quota.licenseKey, quota.deviceId]);

  // Otomatis sinkronkan perubahan profil kelas/soal ke Cloud (debounced 2.5 detik) jika pengguna memiliki Kode Lisensi aktif
  useEffect(() => {
    if (!isLicensed(quota.tier) || !quota.licenseKey) return;
    const timer = setTimeout(() => {
      pushWorkspaceToCloud().catch(() => {});
    }, 2500);
    return () => clearTimeout(timer);
  }, [schoolProfile, bankList.length, isClassConfirmed, quota.tier, quota.licenseKey]);

  const handleReloadFromCloudRestore = () => {
    const refreshedProf = getSchoolProfile();
    setSchoolProfile(refreshedProf);
    setIsClassConfirmed(hasConfirmedClassSetup());
    const refreshedBank = getBankSoal();
    if (refreshedBank.length > 0) {
      setBankList(refreshedBank);
      setCurrentAssessment(refreshedBank[0]);
    }
    triggerAppToast('☁️ Seluruh riwayat kelas, nilai & bank soal dari perangkat Anda berhasil dimuat!');
  };

  const handleGenerate = async (req: GenerationRequest) => {
    setErrorMessage(null);
    const quotaResult = deductQuota();
    if (!quotaResult.success) {
      setErrorMessage(quotaResult.message || 'Kuota pembuatan soal Bapak/Ibu habis.');
      setIsLicenseModalOpen(true);
      return;
    }

    setQuota(quotaResult.quota);
    setIsLoading(true);
    try {
      const assessment = await generateAsesmen(req);
      setCurrentAssessment(assessment);
      saveToBankSoal(assessment);
      setBankList(getBankSoal());
      setActiveTab('worksheet');
    } catch (err: any) {
      const refunded = refundQuota();
      setQuota(refunded);
      setErrorMessage(
        `${err.message || 'Gagal memproses asesmen.'} (Kredit kuota telah dikembalikan secara otomatis ke akun Bapak/Ibu).`
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleGenerateRangkuman = async (req: RangkumanRequest) => {
    setErrorMessage(null);
    const quotaResult = deductQuota();
    if (!quotaResult.success) {
      setErrorMessage(quotaResult.message || 'Kuota pembuatan rangkuman materi habis.');
      setIsLicenseModalOpen(true);
      return;
    }

    setQuota(quotaResult.quota);
    setIsLoadingRangkuman(true);
    try {
      const summary = await generateRangkumanMateri(req);
      setCurrentRangkuman(summary);
      saveToBankRangkuman(summary);
      setActiveTab('rangkuman_view');
    } catch (err: any) {
      const refunded = refundQuota();
      setQuota(refunded);
      setErrorMessage(
        `${err.message || 'Gagal merangkum materi.'} (Kredit kuota telah dikembalikan secara otomatis ke akun Bapak/Ibu).`
      );
    } finally {
      setIsLoadingRangkuman(false);
    }
  };

  const handleSelectFromBank = (doc: AsesmenDokumen, targetTab: 'worksheet' | 'teacher_guide') => {
    setCurrentAssessment(doc);
    setActiveTab(targetTab);
  };

  const handleDeleteFromBank = (id: string) => {
    const updated = deleteFromBankSoal(id);
    setBankList(updated);
    if (currentAssessment?.id === id) {
      setCurrentAssessment(updated[0] || null);
    }
  };

  const handleUpdateAssessment = (updatedDoc: AsesmenDokumen) => {
    setCurrentAssessment(updatedDoc);
    saveToBankSoal(updatedDoc);
    setBankList(getBankSoal());
  };

  const handleCreateAssessmentFromRangkuman = () => {
    if (!currentRangkuman) return;
    const poinRingkas = currentRangkuman.poinUtama.map((p) => p.judul).join(', ');
    setPrefillAssessment({
      mataPelajaran: currentRangkuman.mataPelajaran,
      jenjangFase: currentRangkuman.jenjangFase,
      kelas: currentRangkuman.kelas,
      materiPokok: currentRangkuman.topik,
      tujuanPembelajaranInput: `${currentRangkuman.ringkasanSatuKalimat} (Mencakup konsep: ${poinRingkas})`,
      sourceRangkuman: currentRangkuman,
    });
    setActiveTab('generator');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleCreateRangkumanFromAssessment = () => {
    if (!currentAssessment) return;
    setPrefillRangkuman({
      mataPelajaran: currentAssessment.mataPelajaran,
      jenjangFase: currentAssessment.jenjangFase,
      kelas: currentAssessment.kelas,
      topik: currentAssessment.materiPokok,
      catatanKeinginan: `Buat lembar rangkuman belajar siswa yang mencakup Tujuan Pembelajaran: ${currentAssessment.tujuanPembelajaran.join('; ')}`,
    });
    setActiveTab('rangkuman_gen');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleInstantGenerateAssessmentFromTP = async (tp: CustomTPItem, profile: SchoolProfile) => {
    const targetFase = jenjangToDefaultFase(profile.jenjang, profile.kelasUtama);
    await handleGenerate({
      mataPelajaran: profile.mataPelajaranUtama,
      jenjangFase: targetFase,
      kelas: profile.kelasUtama,
      tipeAsesmen: 'Formatif (Proses Pembelajaran)',
      materiPokok: tp.materiPokok,
      tujuanPembelajaranInput: `[TP ${tp.kode}] ${tp.tujuanPembelajaran}`,
      jumlahPG: 5,
      jumlahPGK: 2,
      jumlahUraian: 2,
      levelKognitif: 'Campuran Berimbang',
      sertakanRubrik: true,
      alokasiWaktu: '80 Menit',
      namaSekolah: profile.namaSekolah,
      namaGuru: profile.namaGuru,
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleInstantGenerateRangkumanFromTP = async (tp: CustomTPItem, profile: SchoolProfile) => {
    const targetFase = jenjangToDefaultFase(profile.jenjang, profile.kelasUtama);
    const defaultGaya =
      targetFase.includes('SMA') || targetFase.includes('SMK')
        ? 'Analitis & Mendalam (Cocok SMA/SMK)'
        : targetFase.includes('SMP')
        ? 'Struktur Ringkas & Poin Kunci (Infografis)'
        : 'Ceria & Analogi Sehari-hari (Cocok SD/SMP)';

    await handleGenerateRangkuman({
      modeInput: 'keinginan_user',
      mataPelajaran: profile.mataPelajaranUtama,
      jenjangFase: targetFase,
      kelas: profile.kelasUtama,
      topik: tp.materiPokok,
      catatanKeinginan: tp.arahanRangkuman,
      gayaBahasa: defaultGaya,
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSelectTPForAssessment = (tp: CustomTPItem, profile: SchoolProfile) => {
    const targetFase = jenjangToDefaultFase(profile.jenjang, profile.kelasUtama);
    setPrefillAssessment({
      mataPelajaran: profile.mataPelajaranUtama,
      jenjangFase: targetFase,
      kelas: profile.kelasUtama,
      materiPokok: tp.materiPokok,
      tujuanPembelajaranInput: `[TP ${tp.kode}] ${tp.tujuanPembelajaran}`,
      sourceRangkuman: undefined,
    });
    setActiveTab('generator');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSelectTPForRangkuman = (tp: CustomTPItem, profile: SchoolProfile) => {
    const targetFase = jenjangToDefaultFase(profile.jenjang, profile.kelasUtama);
    setPrefillRangkuman({
      mataPelajaran: profile.mataPelajaranUtama,
      jenjangFase: targetFase,
      kelas: profile.kelasUtama,
      topik: tp.materiPokok,
      catatanKeinginan: tp.arahanRangkuman,
    });
    setActiveTab('rangkuman_gen');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleOpenModulAjar = (tp: CustomTPItem, profile: SchoolProfile) => {
    const doc = buildSmartModulAjar(tp, profile);
    setCurrentModulAjar(doc);
    setActiveTab('modul_ajar');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleOpenLKPD = (tp: CustomTPItem, profile: SchoolProfile) => {
    setActiveLKPDTP(tp);
    const doc = buildSmartLKPD(tp, profile);
    setCurrentLKPD(doc);
    setActiveTab('lkpd');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handlePrint = () => {
    if (!isLicensed(quota.tier)) {
      setErrorMessage(
        'Mode Pratinjau: Silakan aktifkan Lisensi Guru Mandiri atau Lisensi Sekolah terlebih dahulu untuk mencetak / menyimpan PDF resmi.'
      );
      setIsLicenseModalOpen(true);
      return;
    }
    window.print();
  };

  const isViewingDoc =
    activeTab === 'worksheet' ||
    activeTab === 'kisi_kisi' ||
    activeTab === 'teacher_guide' ||
    activeTab === 'rangkuman_view' ||
    activeTab === 'modul_ajar' ||
    activeTab === 'lkpd';

  const isClassHubSubTab = [
    'tp_list',
    'atp',
    'prota',
    'promes',
    'presensi',
    'jurnal',
    'nilai',
    'rapor',
  ].includes(activeTab);

  const activeTP =
    activeLKPDTP ||
    (currentLKPD
      ? activeTPList.find((t) => t.id === currentLKPD.tpId || t.kode === currentLKPD.tpKode)
      : undefined) ||
    activeTPList[0];

  const headerInfo = getTabHeaderInfo(
    activeTab,
    schoolProfile,
    activeKelasHarian.daftarSiswa.length,
    isClassConfirmed
  );

  return (
    <div className="app-shell" style={{ minHeight: '100vh', display: 'flex', background: '#f8fafc' }}>
      <AppSidebar
        activeTab={activeTab}
        onSelectTab={(tab: SidebarTabId) => {
          handleConfirmClassChange(true);
          setActiveTab(tab);
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }}
        schoolProfile={schoolProfile}
        quota={quota}
        bankCount={bankList.length}
        onOpenClassModal={() => setIsClassModalOpen(true)}
        onOpenSchoolModal={() => setIsSchoolModalOpen(true)}
        onOpenLicenseModal={() => setIsLicenseModalOpen(true)}
        isMobileOpen={isMobileSidebarOpen}
        onCloseMobile={() => setIsMobileSidebarOpen(false)}
      />

      <div className="app-content-column" style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
        <TopHeader
          pageTitle={headerInfo.title}
          pageSubtitle={headerInfo.subtitle}
          schoolProfile={schoolProfile}
          onOpenSchoolModal={() => setIsSchoolModalOpen(true)}
          onOpenLicenseModal={() => setIsLicenseModalOpen(true)}
          isPro={isLicensed(quota.tier)}
          onToggleMobileSidebar={() => setIsMobileSidebarOpen(!isMobileSidebarOpen)}
        />

        <main className="app-main-container" style={{ flex: 1, padding: '24px 28px 80px', maxWidth: 1240, width: '100%', margin: '0 auto' }}>
          <AppErrorBanner message={errorMessage} onDismiss={() => setErrorMessage(null)} />

          <BackToHubButton
            visible={isViewingDoc}
            onBack={() => {
              setActiveTab('tp_list');
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
          />

          {isClassHubSubTab && (
            <div className="animate-view-enter" key={activeTab}>
              <ClassSemesterHub
                schoolProfile={schoolProfile}
                onUpdateProfile={syncProfileUpdate}
                onOpenSchoolModal={() => setIsSchoolModalOpen(true)}
                onOpenLicenseModal={() => setIsLicenseModalOpen(true)}
                onInstantGenerateAssessment={handleInstantGenerateAssessmentFromTP}
                onInstantGenerateRangkuman={handleInstantGenerateRangkumanFromTP}
                onOpenModulAjar={handleOpenModulAjar}
                onOpenLKPD={handleOpenLKPD}
                onCustomAssessmentForm={handleSelectTPForAssessment}
                onCustomRangkumanForm={handleSelectTPForRangkuman}
                isGeneratingAssessment={isLoading}
                isGeneratingRangkuman={isLoadingRangkuman}
                initialConfirmed={isClassConfirmed}
                onConfirmChange={handleConfirmClassChange}
                activeSubTab={activeTab as any}
                onSelectSubTab={(tab) => {
                  handleConfirmClassChange(true);
                  setActiveTab(tab as any);
                }}
              />
            </div>
          )}

          <Suspense
            fallback={
              <div style={{ padding: '48px 24px', textAlign: 'center', color: '#64748b', fontWeight: 600 }}>
                Memuat tampilan dokumen...
              </div>
            }
          >
            {activeTab === 'supervisi' && (
              <div className="animate-view-enter" key="supervisi">
                <PaketSupervisiDashboard
                  schoolProfile={schoolProfile}
                  tpList={activeTPList}
                  kelasHarian={activeKelasHarian}
                  onBackToClassHub={() => setActiveTab('tp_list')}
                  onToast={triggerAppToast}
                />
              </div>
            )}

            {activeTab === 'ujian_semester' && (
              <div className="animate-view-enter" key="ujian_semester">
                <NaskahUjianSemesterView profile={schoolProfile} tpList={activeTPList} />
              </div>
            )}

            {activeTab === 'p5_project' && (
              <div className="animate-view-enter" key="p5_project">
                <P5ProjectView profile={schoolProfile} kelasHarian={activeKelasHarian} />
              </div>
            )}

            {activeTab === 'bank' && (
              <div className="animate-view-enter" key="bank">
                <BankSoalView
                  bankList={bankList}
                  onSelectAssessment={handleSelectFromBank}
                  onDeleteAssessment={handleDeleteFromBank}
                  onGoToGenerator={() => setActiveTab('generator')}
                />
              </div>
            )}

            {activeTab === 'generator' && (
              <div className="animate-view-enter" key="generator">
                <GeneratorForm
                  onGenerate={handleGenerate}
                  isLoading={isLoading}
                  schoolProfile={schoolProfile}
                  prefillData={prefillAssessment}
                />
              </div>
            )}

            {activeTab === 'rangkuman_gen' && (
              <div className="animate-view-enter" key="rangkuman_gen">
                <RangkumanGenerator
                  onGenerate={handleGenerateRangkuman}
                  isLoading={isLoadingRangkuman}
                  schoolProfile={schoolProfile}
                  prefillData={prefillRangkuman}
                />
              </div>
            )}

            {(activeTab === 'worksheet' || activeTab === 'kisi_kisi' || activeTab === 'teacher_guide') &&
              currentAssessment && (
                <div className="animate-view-enter" key={activeTab}>
                  <AssessmentViewer
                    assessment={currentAssessment}
                    mode={activeTab}
                    quota={quota}
                    schoolProfile={schoolProfile}
                    onPrint={handlePrint}
                    onUpdateAssessment={handleUpdateAssessment}
                    onSwitchMode={(m) => setActiveTab(m)}
                    onCreateRangkumanFromAssessment={handleCreateRangkumanFromAssessment}
                    onBackToClassHub={() => setActiveTab('tp_list')}
                  />
                </div>
              )}

            {activeTab === 'modul_ajar' && currentModulAjar && (
              <div className="animate-view-enter" key="modul_ajar">
                <ModulAjarViewer
                  modul={currentModulAjar}
                  schoolProfile={schoolProfile}
                  onPrint={handlePrint}
                  onBackToClassHub={() => setActiveTab('tp_list')}
                />
              </div>
            )}

            {activeTab === 'lkpd' && currentLKPD && (
              <div className="animate-view-enter" key="lkpd">
                <LKPDViewer
                  lkpd={currentLKPD}
                  schoolProfile={schoolProfile}
                  customTP={activeTP}
                  onPrint={handlePrint}
                  onBackToClassHub={() => setActiveTab('tp_list')}
                />
              </div>
            )}

            {activeTab === 'rangkuman_view' && currentRangkuman && (
              <div className="animate-view-enter" key="rangkuman_view">
                <RangkumanViewer
                  rangkuman={currentRangkuman}
                  schoolProfile={schoolProfile}
                  onPrint={handlePrint}
                  onGoToGenerator={() => setActiveTab('rangkuman_gen')}
                  onCreateAssessmentFromRangkuman={handleCreateAssessmentFromRangkuman}
                  onBackToClassHub={() => setActiveTab('tp_list')}
                  onUpdateRangkuman={(updated) => {
                    setCurrentRangkuman(updated);
                    saveToBankRangkuman(updated);
                  }}
                />
              </div>
            )}
          </Suspense>
        </main>

        <AppFooter
          onOpenClassModal={() => setIsClassModalOpen(true)}
          onOpenSchoolModal={() => setIsSchoolModalOpen(true)}
          onOpenLicenseModal={() => setIsLicenseModalOpen(true)}
        />
      </div>

      <FloatingProPromoBar
        visible={quota.tier === 'free' && isViewingDoc && !dismissPromoBar}
        onOpenLicenseModal={() => setIsLicenseModalOpen(true)}
        onDismiss={() => setDismissPromoBar(true)}
      />

      <MobileBottomNav
        activeTab={activeTab}
        onSelectTab={(tab) => {
          handleConfirmClassChange(true);
          setActiveTab(tab);
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }}
        onOpenMobileMenu={() => setIsMobileSidebarOpen(true)}
      />

      <ClassSelectorModal
        isOpen={isClassModalOpen}
        onClose={() => setIsClassModalOpen(false)}
        schoolProfile={schoolProfile}
        onUpdateProfile={(prof) => {
          syncProfileUpdate(prof);
          handleConfirmClassChange(true);
        }}
        onToast={triggerAppToast}
      />

      <SchoolProfileModal
        isOpen={isSchoolModalOpen}
        onClose={() => setIsSchoolModalOpen(false)}
        profile={schoolProfile}
        onUpdateProfile={syncProfileUpdate}
      />

      <LicenseModal
        isOpen={isLicenseModalOpen}
        onClose={() => setIsLicenseModalOpen(false)}
        quota={quota}
        onUpdateQuota={(newQ) => setQuota(newQ)}
        onRestoredFromCloud={handleReloadFromCloudRestore}
      />

      <AppToastBanner message={appToast} />
    </div>
  );
}

export default App;
