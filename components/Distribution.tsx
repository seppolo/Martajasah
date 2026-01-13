
import React, { useRef, useState, useMemo } from 'react';
import { Distribution, User } from '../types';
import { supabaseService } from '../services/supabaseService';
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';

interface DistributionProps {
  distributions: Distribution[];
  setDistributions: React.Dispatch<React.SetStateAction<Distribution[]>>;
  highlightId?: string | null;
  canManage?: boolean;
  canProcess?: boolean;
  currentUser?: User | null;
}

const STATIC_SCHOOL_NAMES = [
  'TK AL-MUHIBBIN',
  'SMKN 3 BANGKALAN',
  'SDN MLAJAH 1',
  'SDN MARTAJASAH',
  'SDN KRAMAT 1',
  'SDN KRAMAT 2',
  'SDN SEMBILANGAN',
  'SMPN 7 BANGKALAN',
  'SDIT NURUL RAHMAH',
  'TK ANBUNAYYA'
];

const ADDRESS_MAPPING: Record<string, string> = {
  'TK AL-MUHIBBIN': 'Jalan Raya Martajasah No. 37, Kelurahan Martajasah, Kec. Bangkalan',
  'SMKN 3 BANGKALAN': 'Jl. Mertajasah No.70, Blandungan, Mertajasah, Kec. Bangkalan',
  'SDN MLAJAH 1': 'Jl. Sidingkap, Mlajah, Kec. Bangkalan',
  'SDN MARTAJASAH': 'Jl. Kemuning, Mertajasah, Kec. Bangkalan',
  'SDN KRAMAT 1': 'Pelinggian Timur, Kramat, Kec. Bangkalan',
  'SDN KRAMAT 2': 'Dusun Morkolak Timur, Kramat, Kec. Bangkalan',
  'SDN SEMBILANGAN': 'Jl. Sembilangan No.03, Sembilangan, Kec. Bangkalan',
  'SMPN 7 BANGKALAN': 'Jl. Raya Markolak Timur, Kramat, Kec. Bangkalan',
  'SDIT NURUL RAHMAH': 'Jl. Teuku Umar II, Kemayoran, Kec. Bangkalan',
  'TK ANBUNAYYA': 'Perum Griya Abadi Blok BB 01, Mlajah, Kec. Bangkalan',
};

/**
 * Robust helper to get YYYY-MM-DD based on Asia/Jakarta timezone
 */
const getJakartaDateString = (date: Date = new Date()) => {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jakarta' }).format(date);
};

/**
 * Robust helper to get Full ISO-like string in Asia/Jakarta timezone
 */
const getJakartaFullTimestamp = (date: Date = new Date()) => {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Jakarta',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  }).formatToParts(date);
  
  const get = (type: string) => parts.find(p => p.type === type)?.value;
  return `${get('year')}-${get('month')}-${get('day')}T${get('hour')}:${get('minute')}:${get('second')}`;
};

const toRoman = (num: number): string => {
  const roman: Record<number, string> = {
    1: 'I', 2: 'II', 3: 'III', 4: 'IV', 5: 'V', 6: 'VI',
    7: 'VII', 8: 'VIII', 9: 'IX', 10: 'X', 11: 'XI', 12: 'XII'
  };
  return roman[num] || num.toString();
};

const DistributionList: React.FC<DistributionProps> = ({ distributions, setDistributions, highlightId, canManage, canProcess, currentUser }) => {
  const [isCapturing, setIsCapturing] = useState<string | null>(null);
  const [viewingPhotoId, setViewingPhotoId] = useState<string | null>(null);
  const [tempPickupCount, setTempPickupCount] = useState<number | string>('');
  
  // Set default filter date based on WIB
  const [filterDate, setFilterDate] = useState<string>(() => getJakartaDateString());
  
  const [isManageModalOpen, setIsManageModalOpen] = useState(false);
  const [selectedSchoolsMap, setSelectedSchoolsMap] = useState<Record<string, number>>({});
  const [commonConfig, setCommonConfig] = useState({ 
    defaultPortions: 100 
  });

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const currentViewingDist = useMemo(() => {
    return distributions.find(d => d.id === viewingPhotoId);
  }, [distributions, viewingPhotoId]);

  const filteredDistributions = useMemo(() => {
    return distributions.filter(d => d.timestamp.startsWith(filterDate));
  }, [distributions, filterDate]);

  const hasPreparingDists = useMemo(() => {
    return filteredDistributions.some(d => d.status === 'PREPARING');
  }, [filteredDistributions]);

  const drawSuratJalan = (doc: jsPDF, dist: Distribution, startY: number, dateStr: string) => {
    const marginX = 20;
    let currentY = startY;

    const sizeTitle = 16;
    const sizeSub = 11.5;
    const sizeBody = 10;

    doc.setFontSize(sizeTitle);
    doc.setFont('helvetica', 'bold');
    doc.text('SURAT JALAN', 105, currentY, { align: 'center' });
    
    currentY += 7.5;
    doc.setFontSize(sizeSub);
    doc.text('PROGRAM MAKAN BERGIZI GRATIS (MBG)', 105, currentY, { align: 'center' });
    
    currentY += 6;
    doc.text('SPPG MARTAJASAH KABUPATEN BANGKALAN', 105, currentY, { align: 'center' });
    
    currentY += 6;
    doc.text('YAYASAN SEHAT LUHUR MANDIRI', 105, currentY, { align: 'center' });

    currentY += 11;
    doc.setFontSize(sizeBody);
    doc.setFont('helvetica', 'normal');

    const drawField = (label: string, value: string, showDots: boolean = false) => {
      doc.text(label, marginX, currentY);
      doc.text(':', marginX + 45, currentY);
      if (showDots) {
         doc.text('......................................................', marginX + 50, currentY);
      } else {
         doc.text(value, marginX + 50, currentY);
      }
      currentY += 5.5;
    };

    const serialNumber = dist.serialNumber || '................................/SJ/MRTJSH/..../....';
    
    drawField('Nomor Surat', serialNumber);
    drawField('Nama Lembaga Tujuan', dist.destination);
    drawField('Alamat Lembaga', ADDRESS_MAPPING[dist.destination] || '.........................................................................');
    drawField('Hari/Tanggal', dateStr);
    drawField('Driver/Supir', dist.driverName ? dist.driverName : '................................');
    drawField('Jumlah Porsi', `${dist.portions} Porsi`);
    drawField('Jumlah Pengembalian', '', true);
    
    doc.text('Catatan', marginX, currentY);
    doc.text(':', marginX + 45, currentY);
    doc.text('.........................................................................................................................', marginX + 50, currentY);
    currentY += 5.5;
    
    doc.text('Waktu Tiba', marginX, currentY);
    doc.text(':', marginX + 45, currentY);
    doc.text('.........................................................................................................................', marginX + 50, currentY);
    currentY += 5.5;
    
    doc.text('Waktu dikonsumsi', marginX, currentY);
    doc.text(':', marginX + 45, currentY);
    doc.text('.........................................................................................................................', marginX + 50, currentY);

    currentY += 6.5;
    doc.setFont('helvetica', 'bolditalic');
    doc.setTextColor(200, 0, 0); 
    doc.text('*Wajib dikomsumsi 1 Jam setelah tiba disekolah', marginX, currentY);
    doc.setTextColor(0, 0, 0); 

    currentY += 10;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(sizeBody);
    
    const leftX = 40;
    const centerX = 105;
    const rightX = 170;

    doc.text('Diperiksa Oleh,', leftX, currentY, { align: 'center' });
    doc.text('Diterima Oleh,', rightX, currentY, { align: 'center' });
    
    currentY += 6;
    doc.text('Ahli Gizi SPPG', leftX, currentY, { align: 'center' });
    doc.text('Driver/Supir', centerX, currentY, { align: 'center' });
    doc.text('Pihak Sekolah', rightX, currentY, { align: 'center' });

    currentY += 16;
    doc.setFont('helvetica', 'bold');
    doc.text('Ruzika Halim, S.Gz.', leftX, currentY, { align: 'center' });
    doc.setFont('helvetica', 'normal');
    doc.text('................................', centerX, currentY, { align: 'center' });
    doc.text('................................', rightX, currentY, { align: 'center' });

    const absoluteBottom = startY + 130; 
    doc.setFontSize(sizeBody);
    doc.setFont('helvetica', 'bold');
    doc.text('NB. SURAT INI DIBERIKAN KEMBALI PADA SAAT PENGEMBALIAN OMPRENG', 105, absoluteBottom, { align: 'center' });
  };

  const exportSuratJalan = () => {
    const preparingDists = filteredDistributions.filter(d => d.status === 'PREPARING');
    
    if (preparingDists.length === 0) {
      alert("Hanya data distribusi berstatus 'PREPARING' yang dapat dibuatkan Surat Jalan.");
      return;
    }

    const doc = new jsPDF({
        orientation: 'p',
        unit: 'mm',
        format: 'a4'
    });
    
    const now = new Date(filterDate);
    const dateStr = now.toLocaleDateString('id-ID', { 
      timeZone: 'Asia/Jakarta',
      weekday: 'long', 
      day: 'numeric', 
      month: 'long', 
      year: 'numeric' 
    });

    const sortedDists = [...preparingDists].sort((a,b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

    for (let i = 0; i < sortedDists.length; i += 2) {
      if (i > 0) doc.addPage();
      drawSuratJalan(doc, sortedDists[i], 12, dateStr);
      if (sortedDists[i + 1]) {
        doc.setLineWidth(0.3);
        doc.setDrawColor(180); 
        doc.setLineDashPattern([4, 2], 0);
        doc.line(10, 148.5, 200, 148.5);
        doc.setLineDashPattern([], 0); 
        drawSuratJalan(doc, sortedDists[i + 1], 160, dateStr);
      }
    }

    doc.save(`Surat_Jalan_MBG_${filterDate}.pdf`);
  };

  const handleDeleteDistribution = (e: React.MouseEvent, id: string) => {
    e.preventDefault(); e.stopPropagation();
    if (!canManage) return;
    if (window.confirm("Batalkan rencana distribusi ini?")) {
      setDistributions(prev => prev.filter(d => d.id !== id));
      if (supabaseService.isConfigured()) supabaseService.deleteRow('distributions', id);
    }
  };

  const stopCapture = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
    }
    setIsCapturing(null);
  };

  const startCapture = (id: string) => {
    setIsCapturing(id);
    navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } })
      .then(stream => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play();
        }
      })
      .catch(err => alert("Kamera Error: " + err));
  };

  const takePhoto = () => {
    if (!videoRef.current || !canvasRef.current || !isCapturing) return;
    const canvas = canvasRef.current;
    const video = videoRef.current;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    const now = new Date();
    const timeStr = now.toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' });
    ctx.fillStyle = "rgba(0, 0, 0, 0.5)";
    ctx.fillRect(0, canvas.height - 60, canvas.width, 60);
    ctx.fillStyle = "white";
    ctx.font = "bold 18px sans-serif";
    ctx.fillText(`MBG DROP: ${timeStr}`, 20, canvas.height - 25);

    const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
    setDistributions(prev => prev.map(d => 
      d.id === isCapturing 
        ? { ...d, status: 'DELIVERED', photoUrl: dataUrl, deliveredAt: getJakartaFullTimestamp(now) } 
        : d
    ));
    stopCapture();
  };

  const handleStartDelivery = (id: string) => {
    setDistributions(prev => prev.map(d => 
      d.id === id ? { 
        ...d, 
        status: 'ON_DELIVERY', 
        sentAt: getJakartaFullTimestamp(),
        driverName: currentUser?.fullName || 'Relawan' 
      } : d
    ));
  };

  const handleStartPickup = (id: string) => {
    setDistributions(prev => prev.map(d => 
      d.id === id ? { 
        ...d, 
        status: 'PICKING_UP', 
        pickupStartedAt: getJakartaFullTimestamp(),
        pickupDriverName: currentUser?.fullName || 'Relawan'
      } : d
    ));
    setTempPickupCount('');
  };

  const handleFinalizePickup = (id: string) => {
    setDistributions(prev => prev.map(d => 
      d.id === id ? { ...d, status: 'PICKED_UP', pickedUpAt: getJakartaFullTimestamp(), pickedUpCount: Number(tempPickupCount) } : d
    ));
    setTempPickupCount('');
  };

  const handleShowPhoto = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setViewingPhotoId(id);
  };

  const totalPortions = useMemo(() => {
    return (Object.values(selectedSchoolsMap) as number[]).reduce((sum, p) => sum + p, 0);
  }, [selectedSchoolsMap]);

  const toggleSchool = (school: string) => {
    setSelectedSchoolsMap(prev => {
      const next = { ...prev };
      if (next[school] !== undefined) delete next[school];
      else next[school] = commonConfig.defaultPortions;
      return next;
    });
  };

  const updatePortion = (school: string, val: number) => {
    if (val < 0) return;
    setSelectedSchoolsMap(prev => ({ ...prev, [school]: val }));
  };

  const toggleAll = () => {
    if (Object.keys(selectedSchoolsMap).length === STATIC_SCHOOL_NAMES.length) {
      setSelectedSchoolsMap({});
    } else {
      const all: Record<string, number> = {};
      STATIC_SCHOOL_NAMES.forEach(s => { all[s] = commonConfig.defaultPortions; });
      setSelectedSchoolsMap(all);
    }
  };

  const handleBulkDeploy = (e: React.FormEvent) => {
    e.preventDefault();
    const selectedEntries = Object.entries(selectedSchoolsMap);
    if (selectedEntries.length === 0) return;

    // VALIDASI: Cek apakah sekolah sudah ada di tanggal yang dipilih (filterDate)
    const existingSchoolsOnThisDate = distributions
      .filter(d => d.timestamp.startsWith(filterDate))
      .map(d => d.destination);

    const duplicates = selectedEntries
      .filter(([name]) => existingSchoolsOnThisDate.includes(name))
      .map(([name]) => name);

    if (duplicates.length > 0) {
      alert(`Peringatan: Sekolah berikut sudah terdaftar untuk tanggal ${filterDate}:\n\n${duplicates.join('\n')}\n\nSetiap sekolah hanya diperbolehkan 1 kali distribusi per hari.`);
      return;
    }

    const now = new Date();
    const [year, month, day] = filterDate.split('-').map(Number);
    const targetTimestamp = `${filterDate}T${now.getHours().toString().padStart(2,'0')}:${now.getMinutes().toString().padStart(2,'0')}:${now.getSeconds().toString().padStart(2,'0')}`;
    const romanMonth = toRoman(month);
    const yearFull = year.toString();
    const suffix = `/SJ/MRTJSH/${romanMonth}/${yearFull}`;

    const existingPeriodSerials = distributions
      .filter(d => d.serialNumber && d.serialNumber.endsWith(suffix))
      .map(d => {
        const parts = d.serialNumber!.split('/');
        return parseInt(parts[0]);
      })
      .filter(num => !isNaN(num));
    
    let nextSerial = existingPeriodSerials.length > 0 ? Math.max(...existingPeriodSerials) + 1 : 1;

    const newDeployments: Distribution[] = (selectedEntries as [string, number][]).map(([name, portions]) => {
      const currentSerial = nextSerial++;
      const formattedSerial = currentSerial.toString().padStart(3, '0') + suffix;

      return {
        id: Math.random().toString(36).substr(2, 9),
        serialNumber: formattedSerial,
        destination: name,
        recipientName: 'PANITIA MBG',
        portions: portions,
        status: 'PREPARING',
        timestamp: targetTimestamp,
        performedBy: currentUser?.username
      };
    });

    setDistributions(prev => [...newDeployments, ...prev]);
    setIsManageModalOpen(false);
    setSelectedSchoolsMap({});
  };

  return (
    <div className="h-full flex flex-col overflow-hidden space-y-4 md:space-y-5 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <header className="flex flex-col md:flex-row md:items-center justify-between px-1 shrink-0 gap-3 md:gap-2">
        <div className="flex items-center space-x-2">
           <div className="relative">
              <input 
                type="date" 
                value={filterDate} 
                onChange={(e) => setFilterDate(e.target.value)}
                className="glass-panel border-blue-500/20 bg-slate-900/50 rounded-xl px-4 py-2 text-[10px] text-white font-black uppercase tracking-widest outline-none focus:border-blue-500 transition-all appearance-none cursor-pointer"
              />
              <i className="fas fa-calendar-day absolute right-3 top-1/2 -translate-y-1/2 text-blue-500/40 pointer-events-none text-[10px]"></i>
           </div>
           <span className="text-[7px] font-black text-slate-500 uppercase tracking-widest hidden md:inline-block">({filteredDistributions.length} DATA)</span>
        </div>

        <div className="flex items-center space-x-2">
          {canManage && (
            <>
              <button 
                onClick={exportSuratJalan}
                disabled={!hasPreparingDists}
                className="bg-orange-600/10 text-orange-600 border border-orange-500/20 px-4 py-2.5 rounded-xl font-black text-[9px] uppercase tracking-widest flex items-center shadow-lg hover:bg-orange-600/20 transition-all disabled:opacity-30 disabled:pointer-events-none"
              >
                <i className="fas fa-file-signature mr-1.5 text-xs"></i> Export Surat Jalan
              </button>
              <button 
                onClick={() => setIsManageModalOpen(true)}
                className="glossy-button text-white px-4 py-2.5 rounded-xl font-black text-[9px] uppercase tracking-widest flex items-center shadow-lg active:scale-95 transition-all"
              >
                <i className="fas fa-layer-group mr-1.5 text-xs"></i> Siapkan
              </button>
            </>
          )}
        </div>
      </header>

      <div className="flex-1 overflow-y-auto no-scrollbar pr-1 pb-5">
        {filteredDistributions.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5 md:gap-5">
            {[...filteredDistributions].sort((a,b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()).map((dist) => {
              const isClosed = dist.status === 'DELIVERED' || dist.status === 'PICKED_UP' || dist.status === 'PICKING_UP';
              const hasPhoto = !!dist.photoUrl;
              return (
                <div key={dist.id} className={`glass-panel rounded-[1.25rem] md:rounded-[1.75rem] overflow-hidden flex flex-col relative transition-all duration-500 group border-blue-500/10 shrink-0 ${highlightId === dist.id ? 'border-blue-400 shadow-[0_0_15px_rgba(59,130,246,0.3)]' : ''}`}>
                  {canManage && (
                    <button onClick={(e) => handleDeleteDistribution(e, dist.id)} className="absolute top-3.5 right-4 text-slate-500/30 hover:text-red-500 p-1.5 z-40 transition-colors cursor-pointer">
                      <i className="fas fa-times text-[10px] md:text-xs"></i>
                    </button>
                  )}
                  <div className="p-4 md:p-5 flex-1">
                      <div className="flex justify-between items-start mb-2.5 md:mb-3.5 pr-7">
                        <div className="min-w-0">
                          <span className={`status-badge text-[6px] md:text-[7px] font-black uppercase tracking-[0.2em] px-1.5 py-0.5 rounded border mb-1.5 inline-block ${
                            dist.status === 'PREPARING' ? 'bg-orange-500/10 text-orange-400 border-orange-500/20' : 
                            dist.status === 'DELIVERED' || dist.status === 'PICKED_UP' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 
                            'bg-blue-500/10 text-blue-400 border-blue-500/20'
                          }`}>
                            {dist.status.replace('_', ' ')}
                          </span>
                          <h4 className="font-black text-xs md:text-sm text-white uppercase leading-tight tracking-tight truncate">{dist.destination}</h4>
                          <div className="flex items-center space-x-1.5 mt-1.5">
                            <i className="fas fa-hashtag text-[8px] text-blue-400 shadow-blue-500/20"></i>
                            <p className="text-[9px] font-black text-blue-400 uppercase tracking-widest">{dist.serialNumber || 'GENERATE_SJ'}</p>
                          </div>
                        </div>
                        {isClosed && hasPhoto && (
                          <button onClick={(e) => handleShowPhoto(e, dist.id)} className="bg-blue-500/20 p-2 rounded-lg border border-blue-500/40 shadow-[0_0_10px_rgba(59,130,246,0.2)] hover:bg-blue-500/40 transition-all group/cam animate-pulse">
                            <i className="fas fa-camera text-blue-400 text-xs"></i>
                          </button>
                        )}
                      </div>
                      <div className="grid grid-cols-2 gap-2.5 mb-2 border-b border-blue-500/5 pb-2">
                        <div className="flex flex-col">
                          <p className="text-[6px] font-black text-slate-500 uppercase tracking-widest mb-0.5">Sekolah</p>
                          <p className="text-[9px] text-slate-100 font-bold truncate">{dist.recipientName}</p>
                        </div>
                        <div className="flex flex-col overflow-hidden">
                          <p className="text-[6px] font-black text-slate-500 uppercase tracking-widest mb-0.5">Personil</p>
                          <div className="space-y-1">
                            {dist.driverName && (
                              <div className="flex items-center space-x-1.5 min-w-0">
                                <i className="fas fa-truck-fast text-[8px] text-blue-400 shrink-0"></i>
                                <p className="text-[8px] text-slate-200 font-bold truncate">{dist.driverName}</p>
                              </div>
                            )}
                            {dist.pickupDriverName && (
                              <div className="flex items-center space-x-1.5 min-w-0">
                                <i className="fas fa-truck-pickup text-[8px] text-orange-400 shrink-0"></i>
                                <p className="text-[8px] text-slate-200 font-bold truncate">{dist.pickupDriverName}</p>
                              </div>
                            )}
                            {!dist.driverName && !dist.pickupDriverName && <p className="text-[8px] text-slate-500 italic">-</p>}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center justify-between p-2 bg-blue-500/5 rounded-lg border border-blue-500/10">
                        <div className="flex flex-col flex-1">
                          <span className="text-[6px] font-black text-blue-400/50 uppercase tracking-widest mb-0.5">Kirim</span>
                          <div className="flex items-center text-blue-400">
                            <i className="fas fa-arrow-up-right-from-square text-[7px] mr-1 opacity-60"></i>
                            <span className="text-[10px] font-black uppercase tracking-widest">{dist.portions} Porsi</span>
                          </div>
                        </div>
                        {(dist.pickedUpCount !== undefined || dist.status === 'PICKING_UP' || dist.status === 'PICKED_UP') && (
                          <div className="flex flex-col flex-1 border-l border-white/5 pl-3.5 ml-3.5">
                            <span className="text-[6px] font-black text-emerald-400/50 uppercase tracking-widest mb-0.5">Kembali</span>
                            <div className="flex items-center text-emerald-400">
                              <i className="fas fa-recycle text-[7px] mr-1 opacity-60"></i>
                              <span className="text-[10px] font-black uppercase tracking-widest">{dist.pickedUpCount || 0} Unit</span>
                            </div>
                          </div>
                        )}
                      </div>
                  </div>
                  <div className="px-4 md:px-5 pb-4 md:pb-5 mt-auto relative z-20">
                    {canProcess ? (
                      <>
                        {dist.status === 'PREPARING' ? (
                          <button onClick={() => handleStartDelivery(dist.id)} className="w-full bg-blue-600 hover:bg-blue-500 text-white py-3 rounded-xl font-black text-[9px] uppercase tracking-widest shadow-lg active:scale-95 transition-all"><i className="fas fa-truck-fast mr-1.5"></i> Mulai Kirim</button>
                        ) : dist.status === 'ON_DELIVERY' ? (
                          <button onClick={() => startCapture(dist.id)} className="w-full glossy-button text-white py-3 rounded-xl font-black text-[9px] uppercase tracking-widest shadow-lg active:scale-95 transition-all"><i className="fas fa-camera mr-1.5"></i> Ambil Bukti</button>
                        ) : dist.status === 'DELIVERED' ? (
                          <button onClick={() => handleStartPickup(dist.id)} className="w-full bg-orange-600 hover:bg-orange-500 text-white py-3 rounded-xl font-black text-[9px] uppercase tracking-widest transition-all shadow-xl active:scale-95"><i className="fas fa-truck-pickup mr-1.5"></i> Jadwalkan Jemput</button>
                        ) : dist.status === 'PICKING_UP' ? (
                          <div className="flex gap-2 p-1.5 bg-orange-500/10 rounded-lg border border-orange-500/20">
                            <input type="number" placeholder="Qty" value={tempPickupCount} onChange={(e) => setTempPickupCount(e.target.value === '' ? '' : Number(e.target.value))} className="w-14 bg-slate-900 border border-orange-500/30 rounded-md px-1.5 py-1 text-[10px] text-white outline-none focus:border-orange-500 font-black text-center" />
                            <button onClick={() => handleFinalizePickup(dist.id)} disabled={tempPickupCount === ''} className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white py-1 rounded-md font-black text-[8px] uppercase tracking-widest shadow-lg active:scale-95 disabled:opacity-50 transition-all">Selesai Jemput</button>
                          </div>
                        ) : (
                          <div className="w-full py-3 rounded-xl flex flex-col items-center justify-center bg-emerald-500/5 border border-emerald-500/10"><span className="text-[7px] font-black text-emerald-400/30 uppercase tracking-[0.4em] flex items-center"><i className="fas fa-check-double mr-1.5 text-xs"></i> ARCHIVED</span></div>
                        )}
                      </>
                    ) : (
                      <div className="w-full py-3 rounded-xl bg-slate-900/50 text-slate-500 font-black text-[7px] uppercase tracking-widest text-center border border-white/5">Hanya Lihat</div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="h-full flex flex-col items-center justify-center py-20 opacity-50">
             <i className="fas fa-calendar-xmark text-4xl text-blue-500/20 mb-4"></i>
             <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em]">Tidak ada data untuk tanggal ini</p>
          </div>
        )}
      </div>

      {isManageModalOpen && canManage && (
        <div className="fixed inset-0 bg-slate-950/95 backdrop-blur-3xl z-[1000] flex items-center justify-center p-2 md:p-3 backdrop-smooth-enter">
          <form onSubmit={handleBulkDeploy} className="bg-[#0f172a] w-full max-w-5xl rounded-[1.75rem] md:rounded-[2.25rem] border border-blue-500/20 shadow-2xl flex flex-col overflow-hidden animate-modal-enter" style={{ maxHeight: '94dvh' }}>
            <div className="shrink-0 p-4 md:p-5 pb-2 md:pb-2.5 border-b border-blue-500/10 bg-blue-500/5">
               <div className="flex justify-between items-center">
                 <div className="flex items-center space-x-2.5">
                    <div className="w-7 h-7 md:w-9 md:h-9 rounded-lg glossy-button flex items-center justify-center text-white"><i className="fas fa-truck-ramp-box text-[10px] md:text-xs"></i></div>
                    <div>
                      <h3 className="font-black text-[9px] md:text-[11px] text-white uppercase tracking-[0.2em] leading-none">Siapkan Distribusi</h3>
                      <p className="text-[6px] text-blue-400 font-black uppercase mt-1 tracking-widest">TANGGAL: {filterDate} (WIB)</p>
                    </div>
                 </div>
                 <button type="button" onClick={() => setIsManageModalOpen(false)} className="text-blue-400/40 hover:text-white w-7 h-7 md:w-9 md:h-9 flex items-center justify-center bg-white/5 rounded-lg transition-all"><i className="fas fa-times text-sm"></i></button>
               </div>
            </div>
            
            <div className="flex-1 overflow-y-auto p-4 md:p-5 flex flex-col space-y-3.5 md:space-y-5 no-scrollbar overscroll-contain">
              <div className="flex justify-between items-center px-1 shrink-0">
                <label className="text-[8px] md:text-[9px] font-black text-blue-400 uppercase tracking-[0.2em]">Daftar Sekolah ({Object.keys(selectedSchoolsMap).length})</label>
                <button type="button" onClick={toggleAll} className="text-[7px] font-black text-blue-500/60 hover:text-blue-400 uppercase tracking-widest">Pilih/Batal Semua</button>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-2 shrink-0">
                {STATIC_SCHOOL_NAMES.map(school => {
                  const portion = selectedSchoolsMap[school];
                  const isActive = portion !== undefined;
                  return (
                    <div key={school} className={`h-12 md:h-14 rounded-lg border transition-all duration-300 relative group overflow-hidden ${isActive ? 'bg-blue-600/20 border-blue-500/50 shadow-md scale-[0.98]' : 'glass-panel border-white/5 hover:border-white/10'}`}>
                      <div className="absolute inset-0 flex items-center px-2.5 pointer-events-none">
                         <div className="flex items-center space-x-2 w-full">
                           <div className={`w-3.5 h-3.5 rounded-sm border flex items-center justify-center shrink-0 transition-all ${isActive ? 'bg-blue-500 border-blue-400' : 'border-white/10'}`}>
                             {isActive && <i className="fas fa-check text-[6px] text-white"></i>}
                           </div>
                           <div className="flex-1 min-w-0">
                             <span className={`text-[7px] md:text-[8px] font-black uppercase tracking-tight truncate block leading-tight ${isActive ? 'text-white' : 'text-slate-400'}`}>{school}</span>
                             {isActive && <span className="text-[6px] font-bold text-blue-400 uppercase tracking-widest">{portion} Porsi</span>}
                           </div>
                         </div>
                      </div>
                      <div className="absolute inset-0 bg-slate-900/95 flex flex-col justify-center px-2.5 opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity duration-300 z-30">
                         <div className="flex items-center justify-between mb-0.5">
                            <span className="text-[6px] font-black text-blue-400 uppercase tracking-widest truncate max-w-[70%]">{school}</span>
                            <button type="button" onClick={() => toggleSchool(school)} className={`w-3.5 h-3.5 rounded-full flex items-center justify-center text-[6px] ${isActive ? 'bg-red-500 text-white' : 'bg-blue-500 text-white'}`}><i className={`fas ${isActive ? 'fa-minus' : 'fa-plus'}`}></i></button>
                         </div>
                         <div className="relative">
                           <input type="number" value={portion || ''} placeholder="Porsi" onChange={(e) => updatePortion(school, Number(e.target.value))} className="w-full bg-slate-950 border border-blue-500/40 rounded-md px-1.5 py-0.5 text-[9px] text-white font-black outline-none focus:border-blue-500" />
                         </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
            <div className="shrink-0 p-4 md:p-5 border-t border-blue-500/10 bg-[#0f172a]/95 pb-[calc(1rem+env(safe-area-inset-bottom))]">
              <button type="submit" disabled={Object.keys(selectedSchoolsMap).length === 0} className="w-full glossy-button text-white py-4 rounded-xl font-black text-[10px] uppercase tracking-[0.3em] active:scale-[0.98] transition-all shadow-2xl disabled:opacity-30">KONFIRMASI LOKASI</button>
            </div>
          </form>
        </div>
      )}

      {isCapturing && (
        <div className="fixed inset-0 bg-black z-[2000] flex flex-col items-center justify-center">
           <video ref={videoRef} className="w-full h-full object-cover" autoPlay playsInline muted></video>
           <canvas ref={canvasRef} className="hidden"></canvas>
           <div className="absolute bottom-10 left-0 right-0 flex justify-around items-center px-10">
              <button onClick={stopCapture} className="w-12 h-12 md:w-14 md:h-14 rounded-full bg-slate-800 flex items-center justify-center text-white"><i className="fas fa-times text-lg md:text-xl"></i></button>
              <button onClick={takePhoto} className="w-14 h-14 md:w-18 md:h-18 rounded-full bg-white border-4 border-blue-500 flex items-center justify-center shadow-[0_0_20px_rgba(59,130,246,0.5)]"><div className="w-10 h-10 md:w-12 md:h-12 rounded-full bg-blue-500"></div></button>
           </div>
        </div>
      )}

      {viewingPhotoId && currentViewingDist?.photoUrl && (
        <div className="fixed inset-0 bg-slate-950/98 backdrop-blur-3xl z-[2000] flex items-center justify-center p-3" onClick={() => setViewingPhotoId(null)}>
           <div className="relative max-w-3xl w-full animate-in zoom-in-95 duration-500">
              <div className="glass-panel p-1.5 rounded-[2rem] overflow-hidden border-blue-500/20 shadow-2xl">
                 <img src={currentViewingDist.photoUrl} className="w-full h-auto max-h-[65dvh] object-contain rounded-[1.75rem]" alt="Dokumentasi" />
              </div>
              <div className="mt-5 flex flex-col items-center space-y-1.5">
                 <h3 className="text-lg font-black text-white uppercase tracking-widest">{currentViewingDist.destination}</h3>
                 <p className="text-[9px] font-black text-blue-400 uppercase tracking-[0.2em]">DROPPED AT (WIB): {new Date(currentViewingDist.deliveredAt || '').toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' })}</p>
                 <button className="mt-3 px-6 py-2 bg-white/5 border border-white/10 rounded-lg text-[9px] font-black text-white uppercase tracking-widest hover:bg-white/10 transition-all">Tutup Pratinjau</button>
              </div>
           </div>
        </div>
      )}
    </div>
  );
};

export default DistributionList;
