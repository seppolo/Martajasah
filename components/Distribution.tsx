
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

const getJakartaDateString = (date: Date = new Date()) => {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jakarta' }).format(date);
};

const DistributionList: React.FC<DistributionProps> = ({ distributions, setDistributions, highlightId, canManage, canProcess, currentUser }) => {
  const [filterDate, setFilterDate] = useState<string>(() => getJakartaDateString());
  const [viewingPhotoId, setViewingPhotoId] = useState<string | null>(null);

  const filteredDistributions = useMemo(() => {
    return distributions.filter(d => d.timestamp.startsWith(filterDate));
  }, [distributions, filterDate]);

  const exportSuratJalan = () => {
    const doc = new jsPDF();
    doc.setFontSize(16);
    doc.text('SURAT JALAN MBG', 105, 20, { align: 'center' });
    doc.setFontSize(10);
    doc.text(`Tanggal: ${filterDate}`, 20, 30);

    const tableColumn = ["No.", "Tujuan", "Porsi", "Penerima"];
    const tableRows = filteredDistributions.map((d, i) => [
      (i+1).toString(), d.destination, d.portions.toString(), d.recipientName
    ]);

    (doc as any).autoTable({
      head: [tableColumn],
      body: tableRows,
      startY: 40,
      theme: 'grid'
    });

    doc.save(`Surat_Jalan_${filterDate}.pdf`);
  };

  return (
    <div className="h-full flex flex-col overflow-hidden space-y-4 md:space-y-5">
      <header className="flex items-center justify-between px-1 shrink-0">
        <input type="date" value={filterDate} onChange={(e) => setFilterDate(e.target.value)} className="glass-panel border-blue-500/20 bg-slate-900/50 rounded-xl px-4 py-2 text-[10px] text-white font-black" />
        <button onClick={exportSuratJalan} className="bg-orange-600/10 text-orange-600 border border-orange-500/20 px-4 py-2.5 rounded-xl font-black text-[9px] uppercase tracking-widest">
           <i className="fas fa-file-signature mr-1.5"></i> Export SJ
        </button>
      </header>
      <div className="flex-1 overflow-y-auto no-scrollbar pr-1 pb-5">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
          {filteredDistributions.map((dist) => (
            <div key={dist.id} className="glass-panel rounded-[1.25rem] p-4 flex flex-col">
              <span className="text-[7px] font-black uppercase text-blue-400 mb-2">{dist.status}</span>
              <h4 className="font-black text-xs text-white uppercase truncate">{dist.destination}</h4>
              <p className="text-[10px] text-slate-400 mt-2">{dist.portions} Porsi</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default DistributionList;
