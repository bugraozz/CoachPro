import { useState, useEffect, useRef } from 'react';

interface ClientData {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  gender: string;
  age: number;
  height: number;
  currentWeight: number;
  targetWeight?: number;
  healthNotes?: string;
  photoUrl?: string;
  joinDate: string;
  active: boolean;
  weightHistory: Array<{ id: string; weight: number; date: string }>;
  measurements: Array<any>;
  bodyAnalyses: Array<any>;
  programs: Array<any>;
  dietPlans: Array<any>;
}

type TabType = 'overview' | 'analysis' | 'program' | 'diet' | 'progress';

export default function ClientProfile({ client }: { client: ClientData }) {
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [showWeightModal, setShowWeightModal] = useState(false);
  const [showMeasureModal, setShowMeasureModal] = useState(false);
  const [showProgramModal, setShowProgramModal] = useState(false);
  const [showDietModal, setShowDietModal] = useState(false);
  const [showAnalysisUpload, setShowAnalysisUpload] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<any>(null);
  const [analysisLoading, setAnalysisLoading] = useState(false);
  const [selectedAnalysis, setSelectedAnalysis] = useState<any>(null);
  const chartRef = useRef<HTMLCanvasElement>(null);
  const chartInstanceRef = useRef<any>(null);

  const tabs: { key: TabType; label: string; icon: string }[] = [
    { key: 'overview', label: 'Genel Bakış', icon: '📊' },
    { key: 'analysis', label: 'Vücut Analizi', icon: '🦴' },
    { key: 'program', label: 'Program', icon: '🏋️' },
    { key: 'diet', label: 'Diyet', icon: '🥗' },
    { key: 'progress', label: 'Gelişim', icon: '📈' },
  ];

  useEffect(() => {
    if (activeTab === 'overview' || activeTab === 'progress') {
      renderWeightChart();
    }
    return () => {
      if (chartInstanceRef.current) {
        chartInstanceRef.current.destroy();
      }
    };
  }, [activeTab]);

  function renderWeightChart() {
    if (!chartRef.current || client.weightHistory.length === 0) return;
    if (chartInstanceRef.current) chartInstanceRef.current.destroy();

    const sorted = [...client.weightHistory].sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
    );

    const Chart = (window as any).Chart;
    if (!Chart) return;

    chartInstanceRef.current = new Chart(chartRef.current, {
      type: 'line',
      data: {
        labels: sorted.map(w => new Date(w.date).toLocaleDateString('tr-TR')),
        datasets: [
          {
            label: 'Kilo (kg)',
            data: sorted.map(w => w.weight),
            borderColor: '#00F5A0',
            backgroundColor: 'rgba(0, 245, 160, 0.1)',
            borderWidth: 2,
            fill: true,
            tension: 0.4,
            pointBackgroundColor: '#00F5A0',
            pointBorderColor: '#00F5A0',
            pointRadius: 4,
            pointHoverRadius: 6,
          },
          ...(client.targetWeight
            ? [{
                label: 'Hedef',
                data: sorted.map(() => client.targetWeight),
                borderColor: '#FF6B35',
                borderWidth: 1,
                borderDash: [5, 5],
                pointRadius: 0,
                fill: false,
              }]
            : []),
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { labels: { color: '#8888a0', font: { family: 'Inter' } } },
        },
        scales: {
          x: {
            ticks: { color: '#55556a', font: { family: 'Inter' } },
            grid: { color: 'rgba(255,255,255,0.04)' },
          },
          y: {
            ticks: { color: '#55556a', font: { family: 'Inter' } },
            grid: { color: 'rgba(255,255,255,0.04)' },
          },
        },
      },
    });
  }

  async function handleWeightSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const formData = new FormData(form);
    const weight = parseFloat(formData.get('weight') as string);

    const res = await fetch('/api/weight', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ clientId: client.id, weight }),
    });

    if (res.ok) {
      setShowWeightModal(false);
      window.location.reload();
    }
  }

  async function handleMeasurementSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const formData = new FormData(form);
    const data: any = { clientId: client.id };
    ['chest', 'waist', 'hip', 'armLeft', 'armRight', 'legLeft', 'legRight', 'bodyFat', 'neck', 'shoulders'].forEach(key => {
      const val = formData.get(key);
      if (val) data[key] = parseFloat(val as string);
    });

    const res = await fetch('/api/measurements', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });

    if (res.ok) {
      setShowMeasureModal(false);
      window.location.reload();
    }
  }

  async function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setAnalysisLoading(true);
    const formData = new FormData();
    formData.append('file', file);
    formData.append('clientId', client.id);
    formData.append('analysisType', 'front');

    try {
      const res = await fetch('/api/analysis/upload', {
        method: 'POST',
        body: formData,
      });

      if (res.ok) {
        const result = await res.json();
        setAnalysisResult(result);
        setShowAnalysisUpload(false);
        window.location.reload();
      }
    } catch (err) {
      console.error('Analysis failed:', err);
    } finally {
      setAnalysisLoading(false);
    }
  }

  async function handleProgramSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const formData = new FormData(form);

    const res = await fetch('/api/programs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        clientId: client.id,
        name: formData.get('programName'),
        startDate: formData.get('startDate'),
        days: [
          {
            dayName: 'Pazartesi',
            order: 0,
            exercises: [
              { name: 'Bench Press', muscleGroup: 'Göğüs', sets: 4, reps: '8-12', weight: 60, restSeconds: 90, order: 0 },
              { name: 'Incline Dumbbell Press', muscleGroup: 'Göğüs', sets: 3, reps: '10-12', weight: 24, restSeconds: 60, order: 1 },
              { name: 'Cable Fly', muscleGroup: 'Göğüs', sets: 3, reps: '12-15', weight: 15, restSeconds: 60, order: 2 },
              { name: 'Tricep Pushdown', muscleGroup: 'Triceps', sets: 3, reps: '12-15', weight: 25, restSeconds: 60, order: 3 },
            ],
          },
          {
            dayName: 'Çarşamba',
            order: 1,
            exercises: [
              { name: 'Squat', muscleGroup: 'Bacak', sets: 4, reps: '6-8', weight: 80, restSeconds: 120, order: 0 },
              { name: 'Leg Press', muscleGroup: 'Bacak', sets: 3, reps: '10-12', weight: 150, restSeconds: 90, order: 1 },
              { name: 'Leg Curl', muscleGroup: 'Hamstring', sets: 3, reps: '12-15', weight: 40, restSeconds: 60, order: 2 },
              { name: 'Calf Raise', muscleGroup: 'Baldır', sets: 4, reps: '15-20', weight: 50, restSeconds: 45, order: 3 },
            ],
          },
          {
            dayName: 'Cuma',
            order: 2,
            exercises: [
              { name: 'Deadlift', muscleGroup: 'Sırt', sets: 4, reps: '5-6', weight: 100, restSeconds: 150, order: 0 },
              { name: 'Lat Pulldown', muscleGroup: 'Sırt', sets: 3, reps: '10-12', weight: 55, restSeconds: 60, order: 1 },
              { name: 'Barbell Row', muscleGroup: 'Sırt', sets: 3, reps: '8-10', weight: 60, restSeconds: 90, order: 2 },
              { name: 'Barbell Curl', muscleGroup: 'Biceps', sets: 3, reps: '10-12', weight: 25, restSeconds: 60, order: 3 },
            ],
          },
        ],
      }),
    });

    if (res.ok) {
      setShowProgramModal(false);
      window.location.reload();
    }
  }

  async function handleDietSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const formData = new FormData(form);

    const res = await fetch('/api/diet', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        clientId: client.id,
        name: formData.get('dietName'),
        startDate: new Date().toISOString(),
        dailyCalorieTarget: parseInt(formData.get('calories') as string),
        proteinTarget: parseInt(formData.get('protein') as string),
        carbsTarget: parseInt(formData.get('carbs') as string),
        fatTarget: parseInt(formData.get('fat') as string),
        waterTarget: parseInt(formData.get('water') as string) || 3000,
        meals: [
          {
            name: 'Kahvaltı', order: 0, foods: [
              { name: 'Yumurta (haşlanmış)', amount: 3, unit: 'adet', calories: 234, protein: 18.6, carbs: 1.2, fat: 15.6 },
              { name: 'Tam buğday ekmek', amount: 2, unit: 'dilim', calories: 140, protein: 6, carbs: 24, fat: 2 },
              { name: 'Beyaz peynir', amount: 50, unit: 'gr', calories: 130, protein: 9, carbs: 0.5, fat: 10 },
            ],
          },
          {
            name: 'Öğle Yemeği', order: 1, foods: [
              { name: 'Tavuk göğsü (ızgara)', amount: 200, unit: 'gr', calories: 330, protein: 62, carbs: 0, fat: 7.2 },
              { name: 'Pirinç pilavı', amount: 150, unit: 'gr', calories: 195, protein: 4, carbs: 42, fat: 0.6 },
              { name: 'Salata', amount: 200, unit: 'gr', calories: 30, protein: 2, carbs: 5, fat: 0.5 },
            ],
          },
          {
            name: 'Akşam Yemeği', order: 2, foods: [
              { name: 'Somon (fırında)', amount: 180, unit: 'gr', calories: 367, protein: 36, carbs: 0, fat: 22 },
              { name: 'Sebze sote', amount: 200, unit: 'gr', calories: 80, protein: 3, carbs: 12, fat: 2 },
            ],
          },
          {
            name: 'Ara Öğün', order: 3, foods: [
              { name: 'Protein shake', amount: 1, unit: 'adet', calories: 200, protein: 30, carbs: 8, fat: 4 },
              { name: 'Badem', amount: 30, unit: 'gr', calories: 170, protein: 6, carbs: 6, fat: 15 },
            ],
          },
        ],
      }),
    });

    if (res.ok) {
      setShowDietModal(false);
      window.location.reload();
    }
  }

  const bmi = (client.currentWeight / ((client.height / 100) ** 2)).toFixed(1);
  const weightDiff = client.targetWeight ? (client.currentWeight - client.targetWeight).toFixed(1) : null;

  return (
    <div>
      {/* Profile Header */}
      <header className="px-6 lg:px-8 py-5 border-b border-border-default bg-bg-secondary/80 backdrop-blur-xl sticky top-0 z-50">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-4">
            <a href="/clients" className="p-2 rounded-lg text-text-secondary hover:text-text-primary hover:bg-bg-tertiary transition-all">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>
            </a>
            <div>
              <h1 className="text-2xl font-bold text-text-primary">{client.name}</h1>
              <p className="text-sm text-text-secondary mt-0.5">Müşteri Profili</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button className="btn-secondary" onClick={() => setShowMeasureModal(true)}>
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21.3 8.7 8.7 21.3c-1 1-2.5 1-3.4 0l-2.6-2.6c-1-1-1-2.5 0-3.4L15.3 2.7c1-1 2.5-1 3.4 0l2.6 2.6c1 1 1 2.5 0 3.4Z"/><path d="m7.5 10.5 2 2"/><path d="m10.5 7.5 2 2"/><path d="m13.5 4.5 2 2"/><path d="m4.5 13.5 2 2"/></svg>
              Ölçüm Ekle
            </button>
            <button className="btn-primary" onClick={() => setShowWeightModal(true)}>
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 3v17a1 1 0 0 1-1 1H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v6a1 1 0 0 1-1 1H3"/><path d="m16 19 2 2 4-4"/></svg>
              Kilo Güncelle
            </button>
          </div>
        </div>
      </header>

      <div className="p-6 lg:p-8">
        {/* Profile Card */}
        <div className="card mb-8">
          <div className="flex flex-col lg:flex-row lg:items-center gap-6">
            {/* Avatar */}
            <div className="w-20 h-20 lg:w-24 lg:h-24 rounded-2xl bg-gradient-to-br from-accent-primary to-accent-purple flex items-center justify-center text-3xl lg:text-4xl font-bold text-white overflow-hidden shadow-xl shrink-0">
              {client.photoUrl ? <img src={client.photoUrl} alt={client.name} className="w-full h-full object-cover" /> : client.name.charAt(0).toUpperCase()}
            </div>
            
            {/* Info */}
            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-3 mb-3">
                <h2 className="text-xl lg:text-2xl font-bold text-text-primary">{client.name}</h2>
                <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold ${client.active ? 'bg-accent-green/15 text-accent-green border border-accent-green/20' : 'bg-accent-red/15 text-accent-red border border-accent-red/20'}`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${client.active ? 'bg-accent-green' : 'bg-accent-red'}`}></span>
                  {client.active ? 'Aktif' : 'Pasif'}
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-2 lg:gap-3">
                <span className="inline-flex items-center gap-2 px-3 py-1.5 bg-bg-tertiary rounded-lg text-sm text-text-secondary">
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-text-muted"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                  {client.age} yaş • {client.gender === 'male' ? 'Erkek' : 'Kadın'}
                </span>
                <span className="inline-flex items-center gap-2 px-3 py-1.5 bg-bg-tertiary rounded-lg text-sm text-text-secondary">
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-text-muted"><path d="M12 22V8"/><path d="m5 12 7-4 7 4"/><path d="M12 2v2"/></svg>
                  {client.height} cm
                </span>
                <span className="inline-flex items-center gap-2 px-3 py-1.5 bg-bg-tertiary rounded-lg text-sm">
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-accent-primary"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>
                  <span className="font-semibold text-text-primary">{client.currentWeight} kg</span>
                </span>
                <span className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm ${parseFloat(bmi) > 25 ? 'bg-accent-orange/10 text-accent-orange' : 'bg-accent-green/10 text-accent-green'}`}>
                  BMI: <span className="font-semibold">{bmi}</span>
                </span>
                {client.targetWeight && (
                  <span className="inline-flex items-center gap-2 px-3 py-1.5 bg-accent-cyan/10 text-accent-cyan rounded-lg text-sm">
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></svg>
                    Hedef: <span className="font-semibold">{client.targetWeight} kg</span>
                    <span className={`text-xs ${Number(weightDiff) > 0 ? 'text-accent-orange' : 'text-accent-green'}`}>({weightDiff} kg)</span>
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex overflow-x-auto gap-1 mb-8 bg-bg-card border border-border-default rounded-xl p-1.5 sticky top-[73px] z-40 backdrop-blur-xl">
          {tabs.map(tab => (
            <button
              key={tab.key}
              className={`flex items-center gap-2 px-4 lg:px-5 py-2.5 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${activeTab === tab.key ? 'bg-accent-primary text-white shadow-md' : 'text-text-secondary hover:bg-bg-tertiary hover:text-text-primary'}`}
              onClick={() => setActiveTab(tab.key)}
            >
              <span className="text-base">{tab.icon}</span>
              <span className="hidden sm:inline">{tab.label}</span>
            </button>
          ))}
        </div>

        {/* Tab Content */}
        {activeTab === 'overview' && (
          <div className="animate-fade-in">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-5 mb-8">
              <div className="stat-card group">
                <div className="flex items-start justify-between mb-3">
                  <div className="w-10 h-10 rounded-xl bg-accent-primary/10 flex items-center justify-center group-hover:scale-110 transition-transform">
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-accent-primary"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>
                  </div>
                </div>
                <div className="text-2xl lg:text-3xl font-bold text-text-primary mb-1">{client.currentWeight}</div>
                <div className="text-xs text-text-muted">Mevcut Kilo (kg)</div>
              </div>
              <div className="stat-card group">
                <div className="flex items-start justify-between mb-3">
                  <div className="w-10 h-10 rounded-xl bg-accent-cyan/10 flex items-center justify-center group-hover:scale-110 transition-transform">
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-accent-cyan"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></svg>
                  </div>
                </div>
                <div className="text-2xl lg:text-3xl font-bold text-text-primary mb-1">{client.targetWeight || '—'}</div>
                <div className="text-xs text-text-muted">Hedef Kilo (kg)</div>
              </div>
              <div className="stat-card group">
                <div className="flex items-start justify-between mb-3">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform ${parseFloat(bmi) > 25 ? 'bg-accent-orange/10' : 'bg-accent-green/10'}`}>
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={parseFloat(bmi) > 25 ? 'text-accent-orange' : 'text-accent-green'}><path d="M3 3v18h18"/><path d="m19 9-5 5-4-4-3 3"/></svg>
                  </div>
                </div>
                <div className={`text-2xl lg:text-3xl font-bold mb-1 ${parseFloat(bmi) > 25 ? 'text-accent-orange' : 'text-accent-green'}`}>{bmi}</div>
                <div className="text-xs text-text-muted">BMI Değeri</div>
              </div>
              <div className="stat-card group">
                <div className="flex items-start justify-between mb-3">
                  <div className="w-10 h-10 rounded-xl bg-accent-purple/10 flex items-center justify-center group-hover:scale-110 transition-transform">
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-accent-purple"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
                  </div>
                </div>
                <div className="text-2xl lg:text-3xl font-bold text-text-primary mb-1">{client.weightHistory.length}</div>
                <div className="text-xs text-text-muted">Kilo Ölçüm Kayıtı</div>
              </div>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
              <div className="xl:col-span-2 card">
                <h3 className="text-base font-semibold mb-5 flex items-center gap-2 text-text-primary">
                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-accent-primary"><path d="M3 3v18h18"/><path d="m19 9-5 5-4-4-3 3"/></svg>
                  Kilo Geçmişi
                </h3>
                <div className="h-[280px] w-full relative">
                  <canvas ref={chartRef}></canvas>
                </div>
              </div>

              <div className="flex flex-col gap-5">
                <div className="card">
                  <h3 className="text-base font-semibold mb-4 flex items-center gap-2 text-text-primary">
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-accent-cyan"><path d="M21.3 8.7 8.7 21.3c-1 1-2.5 1-3.4 0l-2.6-2.6c-1-1-1-2.5 0-3.4L15.3 2.7c1-1 2.5-1 3.4 0l2.6 2.6c1 1 1 2.5 0 3.4Z"/><path d="m7.5 10.5 2 2"/><path d="m10.5 7.5 2 2"/><path d="m13.5 4.5 2 2"/><path d="m4.5 13.5 2 2"/></svg>
                    Son Ölçüler
                  </h3>
                  {client.measurements.length > 0 ? (
                    <div className="grid grid-cols-2 gap-2">
                      {Object.entries({
                        'Göğüs': client.measurements[0]?.chest,
                        'Bel': client.measurements[0]?.waist,
                        'Kalça': client.measurements[0]?.hip,
                        'Sol Kol': client.measurements[0]?.armLeft,
                        'Sağ Kol': client.measurements[0]?.armRight,
                        'Sol Bacak': client.measurements[0]?.legLeft,
                        'Sağ Bacak': client.measurements[0]?.legRight,
                        'Yağ %': client.measurements[0]?.bodyFat,
                      }).filter(([, v]) => v != null).map(([label, value]) => (
                        <div key={label} className="flex items-center justify-between p-2.5 bg-bg-tertiary rounded-lg text-sm">
                          <span className="text-text-muted text-xs">{label}</span>
                          <span className="font-semibold text-text-primary">{value} {label === 'Yağ %' ? '%' : 'cm'}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="py-6 bg-bg-tertiary rounded-xl flex flex-col items-center justify-center text-center">
                       <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-text-muted mb-2"><path d="M21.3 8.7 8.7 21.3c-1 1-2.5 1-3.4 0l-2.6-2.6c-1-1-1-2.5 0-3.4L15.3 2.7c1-1 2.5-1 3.4 0l2.6 2.6c1 1 1 2.5 0 3.4Z"/></svg>
                       <p className="text-xs text-text-muted">Henüz ölçüm girilmemiş</p>
                    </div>
                  )}
                  <button className="w-full mt-4 btn-secondary text-sm justify-center" onClick={() => setShowMeasureModal(true)}>
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                    Ölçüm Ekle
                  </button>
                </div>

                {client.healthNotes && (
                  <div className="card border-accent-purple/20 bg-gradient-to-br from-bg-card to-accent-purple/5">
                    <h3 className="text-base font-semibold mb-3 flex items-center gap-2 text-accent-purple">
                      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/></svg>
                      Sağlık Notları
                    </h3>
                    <p className="text-sm text-text-secondary leading-relaxed">{client.healthNotes}</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'analysis' && (
          <div className="animate-fade-in">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold flex items-center gap-2">🦴 Vücut Analizi</h2>
              <button className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg font-semibold text-sm bg-gradient-to-br from-accent-green to-accent-cyan text-bg-primary shadow-glow hover:-translate-y-[1px] hover:shadow-[0_0_40px_rgba(0,245,160,0.25)] transition-all" onClick={() => setShowAnalysisUpload(true)}>
                📸 Yeni Analiz
              </button>
            </div>

            {showAnalysisUpload && (
              <div className="bg-bg-card border border-border-default rounded-2xl p-6 mb-6 shadow-sm">
                <h3 className="text-base font-bold mb-4">Fotoğraf Yükle</h3>
                <div className="w-full min-h-[200px] border-2 border-dashed border-border-default rounded-xl bg-bg-secondary flex flex-col items-center justify-center p-8 text-center cursor-pointer transition-all hover:bg-bg-card hover:border-accent-green group" onClick={() => document.getElementById('analysisFile')?.click()}>
                  <div className="text-4xl mb-4 group-hover:scale-110 transition-transform">{analysisLoading ? '⏳' : '📸'}</div>
                  <div className="text-base font-semibold text-text-primary mb-2">{analysisLoading ? 'Analiz ediliyor...' : 'Fotoğraf yüklemek için tıklayın'}</div>
                  <div className="text-sm text-text-muted">JPG, PNG • Tam vücut fotoğrafı önerilir</div>
                  <input
                    type="file"
                    id="analysisFile"
                    accept="image/*"
                    className="hidden"
                    onChange={handleImageUpload}
                    disabled={analysisLoading}
                  />
                </div>
                <p className="text-xs text-text-muted mt-4 text-center">
                  MediaPipe AI ile 33 eklem noktası, postür analizi ve kas yoğunluğu değerlendirmesi yapılır
                </p>
              </div>
            )}

            {client.bodyAnalyses.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
                {client.bodyAnalyses.map((analysis: any) => (
                  <div key={analysis.id} className="bg-bg-card border border-border-default rounded-2xl p-5 cursor-pointer transition-all hover:-translate-y-1 hover:border-accent-cyan hover:shadow-[0_4px_20px_rgba(0,217,245,0.15)] group" onClick={() => setSelectedAnalysis(analysis)}>
                    <div className="flex items-center gap-4 mb-4">
                      <div className="w-16 h-16 rounded-lg overflow-hidden shrink-0 bg-bg-secondary border border-border-default group-hover:border-accent-cyan transition-colors">
                        <img src={analysis.imageUrl} alt="Analysis" className="w-full h-full object-cover" />
                      </div>
                      <div className="flex flex-col">
                        <h3 className="text-sm font-bold text-text-primary mb-1">
                          {analysis.analysisType === 'front' ? 'Ön Görünüm' : analysis.analysisType === 'back' ? 'Arka Görünüm' : 'Yan Görünüm'}
                        </h3>
                        <div className="text-xs text-text-secondary">
                          {new Date(analysis.date).toLocaleDateString('tr-TR')}
                        </div>
                      </div>
                    </div>
                    {analysis.postureScore != null && (
                      <div className="flex flex-col gap-1.5 pt-3 border-t border-border-default mt-2">
                        <div className="flex justify-between items-center text-xs font-semibold">
                           <span className="text-text-secondary">Postür Skoru</span>
                           <span className={`${analysis.postureScore >= 80 ? 'text-accent-green' : analysis.postureScore >= 60 ? 'text-accent-yellow' : 'text-accent-red'}`}>
                             {analysis.postureScore.toFixed(0)}/100
                           </span>
                        </div>
                        <div className="h-1.5 w-full bg-bg-secondary rounded-full overflow-hidden">
                           <div className={`h-full ${analysis.postureScore >= 80 ? 'bg-accent-green shadow-[0_0_8px_rgba(0,245,160,0.5)]' : analysis.postureScore >= 60 ? 'bg-accent-yellow shadow-[0_0_8px_rgba(255,183,3,0.5)]' : 'bg-accent-red shadow-[0_0_8px_rgba(255,71,87,0.5)]'}`} style={{ width: `${analysis.postureScore}%` }}></div>
                        </div>
                      </div>
                    )}
                    {analysis.landmarks && (
                      <span className="inline-block mt-4 px-2 py-1 rounded bg-accent-cyan/10 border border-accent-cyan/30 text-accent-cyan text-[10px] font-bold uppercase tracking-wider">
                        {Array.isArray(analysis.landmarks) ? analysis.landmarks.length : 0} Landmark
                      </span>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-16 px-4 text-center bg-bg-card border border-dashed border-border-default rounded-2xl">
                <div className="text-5xl mb-5 opacity-80">🦴</div>
                <h3 className="text-xl font-bold mb-2">Henüz vücut analizi yok</h3>
                <p className="text-text-secondary mb-6 max-w-sm">MediaPipe AI ile otomatik eklem tespiti, postür analizi ve kas yoğunluğu değerlendirmesi yapın.</p>
                <button className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-bold text-base bg-gradient-to-br from-accent-green to-accent-cyan text-bg-primary shadow-glow hover:-translate-y-[1px] hover:shadow-[0_0_40px_rgba(0,245,160,0.25)] transition-all" onClick={() => setShowAnalysisUpload(true)}>
                  📸 İlk Analizi Yap
                </button>
              </div>
            )}

            {/* Analysis Detail Modal */}
            {selectedAnalysis && (
              <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-bg-primary/80 backdrop-blur-sm transition-all" onClick={() => setSelectedAnalysis(null)}>
                <div className="bg-bg-card w-full max-w-[1000px] border border-border-default rounded-2xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden" onClick={e => e.stopPropagation()}>
                  <div className="flex items-center justify-between p-5 border-b border-border-default">
                    <h2 className="text-xl font-bold">🦴 Analiz Detayları</h2>
                    <button className="w-8 h-8 flex items-center justify-center rounded-lg bg-bg-secondary text-text-secondary hover:bg-bg-card-hover hover:text-text-primary transition-colors text-lg" onClick={() => setSelectedAnalysis(null)}>✕</button>
                  </div>
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 p-6 overflow-y-auto custom-scrollbar">
                    <div className="flex items-center justify-center bg-bg-secondary rounded-xl border border-border-default p-4 min-h-[400px]">
                      <AnalysisCanvas analysis={selectedAnalysis} />
                    </div>
                    <div className="flex flex-col gap-6">
                      {selectedAnalysis.postureScore != null && (
                        <div className="bg-bg-secondary border border-border-default rounded-xl p-5">
                          <h3 className="text-[13px] font-bold text-text-secondary uppercase tracking-wider mb-4 flex items-center gap-2">📐 Postür Skoru</h3>
                          <div className="w-[120px] h-[120px] mx-auto mb-4 relative flex items-center justify-center rounded-full bg-bg-card border-8 border-bg-card shadow-sm" style={{ background: `conic-gradient(${selectedAnalysis.postureScore >= 80 ? 'var(--accent-green)' : 'var(--accent-yellow)'} ${selectedAnalysis.postureScore}%, transparent 0)` }}>
                            <div className="absolute inset-2 bg-bg-secondary rounded-full flex items-center justify-center shadow-inner">
                              <span className={`text-4xl font-extrabold ${selectedAnalysis.postureScore >= 80 ? 'text-accent-green' : 'text-accent-yellow'} drop-shadow-md`}>
                                {selectedAnalysis.postureScore.toFixed(0)}
                              </span>
                            </div>
                          </div>
                          {selectedAnalysis.postureNotes && (
                            <p className="text-sm font-medium text-text-primary text-center px-4 leading-relaxed">{selectedAnalysis.postureNotes}</p>
                          )}
                        </div>
                      )}
                      {selectedAnalysis.angles && (
                        <div className="bg-bg-secondary border border-border-default rounded-xl p-5">
                          <h3 className="text-[13px] font-bold text-text-secondary uppercase tracking-wider mb-4 flex items-center gap-2">📏 Eklem Açıları</h3>
                          <div className="grid grid-cols-2 gap-3">
                            {Object.entries(selectedAnalysis.angles as Record<string, number>).map(([key, value]) => (
                              <div key={key} className="flex items-center justify-between bg-white/5 border border-border-default rounded-lg p-3">
                                <span className="text-xs font-semibold text-text-secondary">{key}</span>
                                <span className="text-sm font-bold text-accent-yellow">{(value as number).toFixed(1)}°</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                      {selectedAnalysis.muscleDensity && (
                        <div className="bg-bg-secondary border border-border-default rounded-xl p-5">
                          <h3 className="text-[13px] font-bold text-text-secondary uppercase tracking-wider mb-4 flex items-center gap-2">💪 Kas Yoğunluğu</h3>
                          <div className="flex flex-col gap-4">
                            {Object.entries(selectedAnalysis.muscleDensity as Record<string, number>).map(([key, value]) => (
                              <div key={key} className="flex flex-col gap-1.5">
                                <div className="flex justify-between text-xs font-semibold">
                                  <span className="text-text-primary">{key}</span>
                                  <span className="text-accent-purple">{value}/10</span>
                                </div>
                                <div className="h-2 w-full bg-bg-card rounded-full overflow-hidden border border-border-default">
                                  <div className="h-full bg-gradient-to-r from-accent-purple to-accent-cyan shadow-[0_0_8px_rgba(123,97,255,0.4)]" style={{ width: `${(value as number) * 10}%` }} />
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'program' && (
          <div className="animate-fade-in">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold flex items-center gap-2">🏋️ Antrenman Programı</h2>
              <button className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg font-semibold text-sm bg-gradient-to-br from-accent-green to-accent-cyan text-bg-primary shadow-glow hover:-translate-y-[1px] hover:shadow-[0_0_40px_rgba(0,245,160,0.25)] transition-all" onClick={() => setShowProgramModal(true)}>
                ➕ Yeni Program
              </button>
            </div>

            {client.programs.length > 0 ? (
              <div className="flex flex-col gap-5">
                {client.programs[0].days?.map((day: any) => (
                  <div key={day.id} className="bg-bg-card border border-border-default rounded-2xl overflow-hidden hover:border-accent-purple/30 transition-colors group">
                    <div className="flex items-center justify-between p-5 border-b border-border-default bg-bg-secondary/50">
                      <h3 className="text-lg font-bold flex items-center gap-2 text-text-primary">
                        <span className="text-xl">📅</span> {day.dayName}
                      </h3>
                      <span className="px-3 py-1 bg-accent-purple/10 border border-accent-purple/20 text-accent-purple text-xs font-bold uppercase tracking-wider rounded-full shadow-sm">
                        {day.exercises?.length || 0} Egzersiz
                      </span>
                    </div>
                    
                    {day.exercises?.length > 0 ? (
                      <div className="w-full">
                        {/* Table Header */}
                        <div className="grid grid-cols-[2fr_1.5fr_1fr_1fr_1fr_1fr_40px] gap-4 px-6 py-3 bg-white/[0.02] border-b border-border-default text-[11px] font-bold text-text-secondary uppercase tracking-[1px]">
                          <div>Egzersiz</div>
                          <div>Kas Grubu</div>
                          <div className="text-center">Set</div>
                          <div className="text-center">Tekrar</div>
                          <div className="text-center">Ağırlık</div>
                          <div className="text-center">Dinlenme</div>
                          <div></div>
                        </div>
                        {/* Table Body */}
                        <div className="divide-y divide-border-default/50">
                          {day.exercises.map((ex: any) => (
                            <div key={ex.id} className="grid grid-cols-[2fr_1.5fr_1fr_1fr_1fr_1fr_40px] gap-4 px-6 py-4 items-center hover:bg-bg-card-hover transition-colors">
                              <div className="font-bold text-text-primary text-[15px]">{ex.name}</div>
                              <div>
                                <span className={`inline-block px-2.5 py-1 rounded text-xs font-semibold border
                                  ${ex.muscleGroup === 'Göğüs' ? 'bg-blue-500/10 text-blue-400 border-blue-500/30' :
                                    ex.muscleGroup === 'Sırt' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' :
                                    ex.muscleGroup === 'Omuz' ? 'bg-orange-500/10 text-orange-400 border-orange-500/30' :
                                    ex.muscleGroup === 'Bacak' ? 'bg-purple-500/10 text-purple-400 border-purple-500/30' :
                                    ex.muscleGroup === 'Kol' || ex.muscleGroup === 'Biceps' || ex.muscleGroup === 'Triceps' ? 'bg-cyan-500/10 text-cyan-400 border-cyan-500/30' :
                                    'bg-white/5 text-text-secondary border-white/10'
                                  }`}>
                                  {ex.muscleGroup}
                                </span>
                              </div>
                              <div className="flex flex-col items-center">
                                <span className="font-bold text-lg leading-none">{ex.sets}</span>
                                <span className="text-[10px] text-text-muted uppercase mt-0.5">set</span>
                              </div>
                              <div className="flex flex-col items-center">
                                <span className="font-bold text-lg leading-none text-accent-cyan">{ex.reps}</span>
                                <span className="text-[10px] text-text-muted uppercase mt-0.5">tekrar</span>
                              </div>
                              <div className="flex flex-col items-center">
                                <span className="font-bold text-lg leading-none text-accent-green">{ex.weight ? ex.weight : '—'}</span>
                                <span className="text-[10px] text-text-muted uppercase mt-0.5">{ex.weight ? 'kg' : 'Ağırlık'}</span>
                              </div>
                              <div className="flex flex-col items-center">
                                <span className="font-bold text-base leading-none text-accent-yellow">{ex.restSeconds ? ex.restSeconds : '—'}</span>
                                <span className="text-[10px] text-text-muted uppercase mt-0.5">{ex.restSeconds ? 'sn' : 'Dinlenme'}</span>
                              </div>
                              <div className="flex justify-end">
                                <button className="text-text-muted hover:text-white transition-colors">⋮</button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <div className="p-8 text-center text-text-muted text-sm">
                        Bu güne henüz egzersiz eklenmemiş.
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-16 px-4 text-center bg-bg-card border border-dashed border-border-default rounded-2xl">
                <div className="text-5xl mb-5 opacity-80">🏋️</div>
                <h3 className="text-xl font-bold mb-2">Program bulunamadı</h3>
                <p className="text-text-secondary mb-6 max-w-sm">Bu müşteri için detaylı bir antrenman programı oluşturun.</p>
                <button className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-bold text-base bg-gradient-to-br from-accent-green to-accent-cyan text-bg-primary shadow-glow hover:-translate-y-[1px] hover:shadow-[0_0_40px_rgba(0,245,160,0.25)] transition-all" onClick={() => setShowProgramModal(true)}>
                  ➕ Program Oluştur
                </button>
              </div>
            )}
          </div>
        )}

        {activeTab === 'diet' && (
          <div className="animate-fade-in">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold flex items-center gap-2">🥗 Diyet Planı</h2>
              <button className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg font-semibold text-sm bg-gradient-to-br from-accent-green to-accent-cyan text-bg-primary shadow-glow hover:-translate-y-[1px] hover:shadow-[0_0_40px_rgba(0,245,160,0.25)] transition-all" onClick={() => setShowDietModal(true)}>
                ➕ Yeni Diyet
              </button>
            </div>

            {client.dietPlans.length > 0 ? (
              <div className="flex flex-col gap-6">
                {/* Macro Overview */}
                <div className="bg-bg-card border border-border-default rounded-2xl p-6">
                  <div className="flex flex-wrap gap-4 sm:gap-6 lg:gap-8 justify-around items-center">
                    <div className="flex flex-col items-center gap-3">
                      <div className="w-[100px] h-[100px] rounded-full bg-bg-secondary border-[6px] border-bg-card shadow-sm flex items-center justify-center relative before:absolute before:inset-[-6px] before:rounded-full before:border-[3px] before:border-accent-green">
                        <span className="text-xl font-extrabold text-accent-green">{client.dietPlans[0].dailyCalorieTarget}</span>
                      </div>
                      <div className="text-[13px] font-bold text-text-secondary uppercase tracking-wider">Kalori (kcal)</div>
                    </div>
                    <div className="flex flex-col items-center gap-3">
                      <div className="w-[100px] h-[100px] rounded-full bg-bg-secondary border-[6px] border-bg-card shadow-sm flex items-center justify-center relative before:absolute before:inset-[-6px] before:rounded-full before:border-[3px] before:border-accent-cyan">
                        <span className="text-xl font-extrabold text-accent-cyan">{client.dietPlans[0].proteinTarget}g</span>
                      </div>
                      <div className="text-[13px] font-bold text-text-secondary uppercase tracking-wider">Protein</div>
                    </div>
                    <div className="flex flex-col items-center gap-3">
                      <div className="w-[100px] h-[100px] rounded-full bg-bg-secondary border-[6px] border-bg-card shadow-sm flex items-center justify-center relative before:absolute before:inset-[-6px] before:rounded-full before:border-[3px] before:border-accent-orange">
                        <span className="text-xl font-extrabold text-accent-orange">{client.dietPlans[0].carbsTarget}g</span>
                      </div>
                      <div className="text-[13px] font-bold text-text-secondary uppercase tracking-wider">Karbonhidrat</div>
                    </div>
                    <div className="flex flex-col items-center gap-3">
                      <div className="w-[100px] h-[100px] rounded-full bg-bg-secondary border-[6px] border-bg-card shadow-sm flex items-center justify-center relative before:absolute before:inset-[-6px] before:rounded-full before:border-[3px] before:border-accent-yellow">
                        <span className="text-xl font-extrabold text-accent-yellow">{client.dietPlans[0].fatTarget}g</span>
                      </div>
                      <div className="text-[13px] font-bold text-text-secondary uppercase tracking-wider">Yağ</div>
                    </div>
                  </div>
                </div>

                {/* Meals */}
                <div className="flex flex-col gap-4">
                  {client.dietPlans[0].meals?.map((meal: any) => (
                    <div key={meal.id} className="bg-bg-card border border-border-default rounded-xl overflow-hidden hover:border-accent-green/30 transition-colors">
                      <div className="flex justify-between items-center p-4 bg-bg-secondary/50 border-b border-border-default">
                        <h3 className="text-base font-bold flex items-center gap-2">
                          <span>{meal.name === 'Kahvaltı' ? '🌅' : meal.name === 'Öğle Yemeği' ? '☀️' : meal.name === 'Akşam Yemeği' ? '🌙' : '🍎'}</span> {meal.name}
                        </h3>
                        <span className="text-[13px] font-bold text-accent-green bg-accent-green/10 px-3 py-1 rounded-full">
                          {meal.foods?.reduce((sum: number, f: any) => sum + f.calories, 0)} kcal
                        </span>
                      </div>
                      
                      {meal.foods?.length > 0 && (
                        <div>
                          <div className="grid grid-cols-[3fr_1fr_1fr_1fr_1fr_1fr_40px] gap-4 px-5 py-3 bg-white/[0.02] border-b border-border-default text-[10px] font-bold text-text-muted uppercase tracking-[1px]">
                            <div>Besin</div>
                            <div className="text-center">Miktar</div>
                            <div className="text-center">Kalori</div>
                            <div className="text-center">Protein</div>
                            <div className="text-center">Karb</div>
                            <div className="text-center">Yağ</div>
                            <div></div>
                          </div>
                          <div className="divide-y divide-border-default/30">
                            {meal.foods.map((food: any) => (
                              <div key={food.id} className="grid grid-cols-[3fr_1fr_1fr_1fr_1fr_1fr_40px] gap-4 px-5 py-3 items-center hover:bg-white/5 transition-colors text-sm">
                                <div className="font-semibold text-text-primary">{food.name}</div>
                                <div className="text-center text-text-secondary">{food.amount} {food.unit}</div>
                                <div className="text-center font-bold text-text-primary">{food.calories}</div>
                                <div className="text-center font-bold text-accent-cyan">{food.protein}g</div>
                                <div className="text-center font-bold text-accent-orange">{food.carbs}g</div>
                                <div className="text-center font-bold text-accent-yellow">{food.fat}g</div>
                                <div className="flex justify-end">
                                  <button className="text-text-muted hover:text-white">⋮</button>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                {/* Water Tracker */}
                <div className="bg-bg-card border border-accent-cyan/20 rounded-2xl p-6 shadow-sm relative overflow-hidden group">
                  <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI0IiBoZWlnaHQ9IjQiPjxyZWN0IHdpZHRoPSI0IiBoZWlnaHQ9IjQiIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4wNSIvPjwvc3ZnPg==')] opacity-0 group-hover:opacity-100 transition-opacity"></div>
                  <h3 className="text-lg font-bold mb-6 flex items-center gap-2 text-text-primary relative z-10">💧 Su Takibi <span className="text-sm font-medium text-text-secondary">({client.dietPlans[0].waterTarget}ml hedef)</span></h3>
                  <div className="flex flex-wrap gap-4 relative z-10">
                    {Array.from({ length: Math.ceil(client.dietPlans[0].waterTarget / 250) }).map((_, i) => (
                      <div key={i} className={`w-8 h-10 rounded-b-xl rounded-t-sm border-2 transition-all cursor-pointer ${i < 4 ? 'bg-accent-cyan border-accent-cyan shadow-[0_4px_15px_rgba(0,217,245,0.4)]' : 'bg-transparent border-accent-cyan/30 hover:border-accent-cyan/60'}`} title={`${(i + 1) * 250}ml`}></div>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-16 px-4 text-center bg-bg-card border border-dashed border-border-default rounded-2xl">
                <div className="text-5xl mb-5 opacity-80">🥗</div>
                <h3 className="text-xl font-bold mb-2">Diyet planı bulunamadı</h3>
                <p className="text-text-secondary mb-6 max-w-sm">Bu müşteri için bir diyet planı oluşturun.</p>
                <button className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-bold text-base bg-gradient-to-br from-accent-green to-accent-cyan text-bg-primary shadow-glow hover:-translate-y-[1px] hover:shadow-[0_0_40px_rgba(0,245,160,0.25)] transition-all" onClick={() => setShowDietModal(true)}>
                  ➕ Diyet Planı Oluştur
                </button>
              </div>
            )}
          </div>
        )}

        {activeTab === 'progress' && (
          <div className="animate-fade-in">
            <h2 className="text-xl font-bold mb-6 flex items-center gap-2">📈 Gelişim Takibi</h2>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
              <div className="lg:col-span-2 bg-bg-card border border-border-default rounded-2xl p-6 shadow-sm">
                <h3 className="text-lg font-bold mb-5 flex items-center gap-2">⚖️ Kilo Değişimi</h3>
                <div className="h-[300px] w-full relative">
                  <canvas ref={chartRef}></canvas>
                </div>
              </div>

              <div className="bg-bg-card border border-border-default rounded-2xl p-6 shadow-sm flex flex-col">
                <h3 className="text-lg font-bold mb-5 flex items-center gap-2">📊 Özet</h3>
                {client.weightHistory.length >= 2 ? (
                  <div className="flex flex-col gap-4 flex-1 justify-center">
                    <div className="flex flex-col gap-1.5 p-3 rounded-xl border border-white/5 bg-white/[0.02]">
                      <span className="text-xs font-bold text-text-secondary uppercase tracking-wider">Başlangıç</span>
                      <span className="text-xl font-bold">{client.weightHistory[client.weightHistory.length - 1].weight} <span className="text-sm font-normal text-text-muted">kg</span></span>
                    </div>
                    <div className="flex flex-col gap-1.5 p-3 rounded-xl border border-white/5 bg-white/[0.02]">
                      <span className="text-xs font-bold text-text-secondary uppercase tracking-wider">Mevcut</span>
                      <span className="text-xl font-bold text-accent-green">{client.currentWeight} <span className="text-sm font-normal text-text-muted">kg</span></span>
                    </div>
                    <div className="flex flex-col gap-1.5 p-3 rounded-xl border border-white/5 bg-white/[0.02]">
                      <span className="text-xs font-bold text-text-secondary uppercase tracking-wider">Toplam Değişim</span>
                      <span className={`text-xl font-bold ${client.currentWeight <= client.weightHistory[client.weightHistory.length - 1].weight ? 'text-accent-green' : 'text-accent-red'}`}>
                        {(client.currentWeight - client.weightHistory[client.weightHistory.length - 1].weight).toFixed(1)} <span className="text-sm font-normal text-text-muted">kg</span>
                      </span>
                    </div>
                    <div className="flex flex-col gap-1.5 p-3 rounded-xl border border-white/5 bg-white/[0.02]">
                      <span className="text-xs font-bold text-text-secondary uppercase tracking-wider">Kayıt Sayısı</span>
                      <span className="text-xl font-bold">{client.weightHistory.length}</span>
                    </div>
                  </div>
                ) : (
                  <div className="flex-1 flex items-center justify-center text-text-muted text-sm text-center">
                    Karşılaştırma için en az 2 kilo kaydı gereklidir.
                  </div>
                )}
              </div>
            </div>

            {/* Body Analysis Comparison */}
            {client.bodyAnalyses.length >= 2 && (
              <div className="mt-8 bg-bg-card border border-border-default rounded-2xl p-6 shadow-sm">
                <h3 className="text-lg font-bold mb-6 flex items-center gap-2">📸 Vücut Karşılaştırması</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="relative rounded-xl overflow-hidden border border-border-default group">
                    <img src={client.bodyAnalyses[client.bodyAnalyses.length - 1].imageUrl} alt="Before" className="w-full aspect-square object-cover transition-transform duration-500 group-hover:scale-105" />
                    <div className="absolute inset-x-0 bottom-0 p-4 bg-gradient-to-t from-black/80 to-transparent flex items-center justify-between">
                      <span className="font-bold text-white flex items-center gap-2">
                        📅 {new Date(client.bodyAnalyses[client.bodyAnalyses.length - 1].date).toLocaleDateString('tr-TR')}
                      </span>
                      <span className="px-3 py-1 rounded bg-accent-orange/20 text-accent-orange font-bold text-xs uppercase tracking-wider border border-accent-orange/50 backdrop-blur-sm">ÖNCE</span>
                    </div>
                  </div>
                  <div className="relative rounded-xl overflow-hidden border border-border-default group">
                    <img src={client.bodyAnalyses[0].imageUrl} alt="After" className="w-full aspect-square object-cover transition-transform duration-500 group-hover:scale-105" />
                    <div className="absolute inset-x-0 bottom-0 p-4 bg-gradient-to-t from-black/80 to-transparent flex items-center justify-between">
                      <span className="font-bold text-white flex items-center gap-2">
                        📅 {new Date(client.bodyAnalyses[0].date).toLocaleDateString('tr-TR')}
                      </span>
                      <span className="px-3 py-1 rounded bg-accent-green/20 text-accent-green font-bold text-xs uppercase tracking-wider border border-accent-green/50 backdrop-blur-sm">SONRA</span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ===== MODALS ===== */}

        {/* Weight Modal */}
        {showWeightModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-bg-primary/80 backdrop-blur-sm transition-all" onClick={() => setShowWeightModal(false)}>
            <div className="bg-bg-card w-full max-w-md border border-border-default rounded-2xl shadow-2xl overflow-hidden" onClick={e => e.stopPropagation()}>
              <div className="flex items-center justify-between p-5 border-b border-border-default">
                <h2 className="text-xl font-bold">⚖️ Kilo Güncelle</h2>
                <button className="w-8 h-8 flex items-center justify-center rounded-lg bg-bg-secondary text-text-secondary hover:bg-bg-card-hover hover:text-text-primary transition-colors text-lg" onClick={() => setShowWeightModal(false)}>✕</button>
              </div>
              <form onSubmit={handleWeightSubmit} className="p-6">
                <div className="flex flex-col gap-1.5 mb-6">
                  <label className="text-[13px] font-semibold text-text-secondary uppercase tracking-wide">Yeni Kilo (kg)</label>
                  <input type="number" name="weight" className="w-full px-4 py-3 bg-white/5 border border-border-default rounded-lg text-sm text-text-primary focus:border-accent-green focus:ring-2 focus:ring-accent-green/20 outline-none transition-all appearance-none" required step="0.1" min="30" max="300" defaultValue={client.currentWeight} />
                </div>
                <div className="flex gap-4 justify-end">
                  <button type="button" className="inline-flex items-center justify-center px-5 py-2.5 rounded-xl font-semibold text-sm bg-bg-glass border border-border-default text-text-primary hover:border-border-hover hover:bg-bg-card-hover transition-all" onClick={() => setShowWeightModal(false)}>İptal</button>
                  <button type="submit" className="inline-flex items-center justify-center px-5 py-2.5 rounded-xl font-bold text-sm bg-gradient-to-br from-accent-green to-accent-cyan text-bg-primary shadow-glow hover:-translate-y-[1px] hover:shadow-[0_0_40px_rgba(0,245,160,0.25)] transition-all">Kaydet</button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Measurement Modal */}
        {showMeasureModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-bg-primary/80 backdrop-blur-sm transition-all overflow-y-auto" onClick={() => setShowMeasureModal(false)}>
            <div className="bg-bg-card w-full max-w-xl mx-auto my-8 border border-border-default rounded-2xl shadow-2xl overflow-hidden" onClick={e => e.stopPropagation()}>
              <div className="flex items-center justify-between p-5 border-b border-border-default sticky top-0 bg-bg-card z-10">
                <h2 className="text-xl font-bold">📏 Ölçüm Ekle</h2>
                <button className="w-8 h-8 flex items-center justify-center rounded-lg bg-bg-secondary text-text-secondary hover:bg-bg-card-hover hover:text-text-primary transition-colors text-lg" onClick={() => setShowMeasureModal(false)}>✕</button>
              </div>
              <form onSubmit={handleMeasurementSubmit} className="p-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 mb-5">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[13px] font-semibold text-text-secondary uppercase tracking-wide">Göğüs (cm)</label>
                    <input type="number" name="chest" className="w-full px-4 py-3 bg-white/5 border border-border-default rounded-lg text-sm text-text-primary focus:border-accent-green focus:ring-2 focus:ring-accent-green/20 outline-none transition-all" step="0.1" />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[13px] font-semibold text-text-secondary uppercase tracking-wide">Bel (cm)</label>
                    <input type="number" name="waist" className="w-full px-4 py-3 bg-white/5 border border-border-default rounded-lg text-sm text-text-primary focus:border-accent-green focus:ring-2 focus:ring-accent-green/20 outline-none transition-all" step="0.1" />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[13px] font-semibold text-text-secondary uppercase tracking-wide">Kalça (cm)</label>
                    <input type="number" name="hip" className="w-full px-4 py-3 bg-white/5 border border-border-default rounded-lg text-sm text-text-primary focus:border-accent-green focus:ring-2 focus:ring-accent-green/20 outline-none transition-all" step="0.1" />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[13px] font-semibold text-text-secondary uppercase tracking-wide">Omuz (cm)</label>
                    <input type="number" name="shoulders" className="w-full px-4 py-3 bg-white/5 border border-border-default rounded-lg text-sm text-text-primary focus:border-accent-green focus:ring-2 focus:ring-accent-green/20 outline-none transition-all" step="0.1" />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[13px] font-semibold text-text-secondary uppercase tracking-wide">Sol Kol (cm)</label>
                    <input type="number" name="armLeft" className="w-full px-4 py-3 bg-white/5 border border-border-default rounded-lg text-sm text-text-primary focus:border-accent-green focus:ring-2 focus:ring-accent-green/20 outline-none transition-all" step="0.1" />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[13px] font-semibold text-text-secondary uppercase tracking-wide">Sağ Kol (cm)</label>
                    <input type="number" name="armRight" className="w-full px-4 py-3 bg-white/5 border border-border-default rounded-lg text-sm text-text-primary focus:border-accent-green focus:ring-2 focus:ring-accent-green/20 outline-none transition-all" step="0.1" />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[13px] font-semibold text-text-secondary uppercase tracking-wide">Sol Bacak (cm)</label>
                    <input type="number" name="legLeft" className="w-full px-4 py-3 bg-white/5 border border-border-default rounded-lg text-sm text-text-primary focus:border-accent-green focus:ring-2 focus:ring-accent-green/20 outline-none transition-all" step="0.1" />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[13px] font-semibold text-text-secondary uppercase tracking-wide">Sağ Bacak (cm)</label>
                    <input type="number" name="legRight" className="w-full px-4 py-3 bg-white/5 border border-border-default rounded-lg text-sm text-text-primary focus:border-accent-green focus:ring-2 focus:ring-accent-green/20 outline-none transition-all" step="0.1" />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[13px] font-semibold text-text-secondary uppercase tracking-wide">Boyun (cm)</label>
                    <input type="number" name="neck" className="w-full px-4 py-3 bg-white/5 border border-border-default rounded-lg text-sm text-text-primary focus:border-accent-green focus:ring-2 focus:ring-accent-green/20 outline-none transition-all" step="0.1" />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[13px] font-semibold text-text-secondary uppercase tracking-wide">Vücut Yağ %</label>
                    <input type="number" name="bodyFat" className="w-full px-4 py-3 bg-white/5 border border-border-default rounded-lg text-sm text-text-primary focus:border-accent-green focus:ring-2 focus:ring-accent-green/20 outline-none transition-all" step="0.1" />
                  </div>
                </div>
                
                <div className="flex gap-4 justify-end pt-6 border-t border-border-default mt-2">
                  <button type="button" className="inline-flex items-center justify-center px-5 py-2.5 rounded-xl font-semibold text-sm bg-bg-glass border border-border-default text-text-primary hover:border-border-hover hover:bg-bg-card-hover transition-all" onClick={() => setShowMeasureModal(false)}>İptal</button>
                  <button type="submit" className="inline-flex items-center justify-center px-5 py-2.5 rounded-xl font-bold text-sm bg-gradient-to-br from-accent-green to-accent-cyan text-bg-primary shadow-glow hover:-translate-y-[1px] hover:shadow-[0_0_40px_rgba(0,245,160,0.25)] transition-all">Kaydet</button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Program Modal */}
        {showProgramModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-bg-primary/80 backdrop-blur-sm transition-all" onClick={() => setShowProgramModal(false)}>
            <div className="bg-bg-card w-full max-w-md border border-border-default rounded-2xl shadow-2xl overflow-hidden" onClick={e => e.stopPropagation()}>
              <div className="flex items-center justify-between p-5 border-b border-border-default">
                <h2 className="text-xl font-bold">🏋️ Yeni Program</h2>
                <button className="w-8 h-8 flex items-center justify-center rounded-lg bg-bg-secondary text-text-secondary hover:bg-bg-card-hover hover:text-text-primary transition-colors text-lg" onClick={() => setShowProgramModal(false)}>✕</button>
              </div>
              <form onSubmit={handleProgramSubmit} className="p-6">
                <div className="flex flex-col gap-1.5 mb-5">
                  <label className="text-[13px] font-semibold text-text-secondary uppercase tracking-wide">Program Adı</label>
                  <input type="text" name="programName" className="w-full px-4 py-3 bg-white/5 border border-border-default rounded-lg text-sm text-text-primary focus:border-accent-green focus:ring-2 focus:ring-accent-green/20 outline-none transition-all" required defaultValue="3 Günlük Split Program" />
                </div>
                <div className="flex flex-col gap-1.5 mb-5">
                  <label className="text-[13px] font-semibold text-text-secondary uppercase tracking-wide">Başlangıç Tarihi</label>
                  <input type="date" name="startDate" className="w-full px-4 py-3 bg-white/5 border border-border-default rounded-lg text-sm text-text-primary focus:border-accent-green focus:ring-2 focus:ring-accent-green/20 outline-none transition-all" required defaultValue={new Date().toISOString().split('T')[0]} />
                </div>
                <p className="text-sm text-text-muted mb-6 px-1 leading-relaxed">
                  Varsayılan 3 günlük split program (Göğüs/Tricep, Bacak, Sırt/Bicep) oluşturulacak. Daha sonra düzenleyebilirsiniz.
                </p>
                <div className="flex gap-4 justify-end">
                  <button type="button" className="inline-flex items-center justify-center px-5 py-2.5 rounded-xl font-semibold text-sm bg-bg-glass border border-border-default text-text-primary hover:border-border-hover hover:bg-bg-card-hover transition-all" onClick={() => setShowProgramModal(false)}>İptal</button>
                  <button type="submit" className="inline-flex items-center justify-center px-5 py-2.5 rounded-xl font-bold text-sm bg-gradient-to-br from-accent-green to-accent-cyan text-bg-primary shadow-glow hover:-translate-y-[1px] hover:shadow-[0_0_40px_rgba(0,245,160,0.25)] transition-all">Program Oluştur</button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Diet Modal */}
        {showDietModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-bg-primary/80 backdrop-blur-sm transition-all overflow-y-auto" onClick={() => setShowDietModal(false)}>
            <div className="bg-bg-card w-full max-w-lg my-8 mx-auto border border-border-default rounded-2xl shadow-2xl overflow-hidden" onClick={e => e.stopPropagation()}>
              <div className="flex items-center justify-between p-5 border-b border-border-default sticky top-0 bg-bg-card z-10">
                <h2 className="text-xl font-bold">🥗 Yeni Diyet Planı</h2>
                <button className="w-8 h-8 flex items-center justify-center rounded-lg bg-bg-secondary text-text-secondary hover:bg-bg-card-hover hover:text-text-primary transition-colors text-lg" onClick={() => setShowDietModal(false)}>✕</button>
              </div>
              <form onSubmit={handleDietSubmit} className="p-6">
                <div className="flex flex-col gap-1.5 mb-5">
                  <label className="text-[13px] font-semibold text-text-secondary uppercase tracking-wide">Plan Adı</label>
                  <input type="text" name="dietName" className="w-full px-4 py-3 bg-white/5 border border-border-default rounded-lg text-sm text-text-primary focus:border-accent-green focus:ring-2 focus:ring-accent-green/20 outline-none transition-all" required defaultValue="Kas Geliştirme Diyeti" />
                </div>
                <div className="grid grid-cols-2 gap-5 mb-5">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[13px] font-semibold text-text-secondary uppercase tracking-wide">Günlük Kalori (kcal)</label>
                    <input type="number" name="calories" className="w-full px-4 py-3 bg-white/5 border border-border-default rounded-lg text-sm text-text-primary focus:border-accent-green focus:ring-2 focus:ring-accent-green/20 outline-none transition-all" required defaultValue={2200} />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[13px] font-semibold text-text-secondary uppercase tracking-wide">Su Hedefi (ml)</label>
                    <input type="number" name="water" className="w-full px-4 py-3 bg-white/5 border border-border-default rounded-lg text-sm text-text-primary focus:border-accent-green focus:ring-2 focus:ring-accent-green/20 outline-none transition-all" defaultValue={3000} />
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 mb-5">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[13px] font-semibold text-text-secondary uppercase tracking-wide">Protein (g)</label>
                    <input type="number" name="protein" className="w-full px-4 py-3 bg-white/5 border border-border-default rounded-lg text-sm text-text-primary focus:border-accent-green focus:ring-2 focus:ring-accent-green/20 outline-none transition-all" required defaultValue={180} />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[13px] font-semibold text-text-secondary uppercase tracking-wide">Karb. (g)</label>
                    <input type="number" name="carbs" className="w-full px-4 py-3 bg-white/5 border border-border-default rounded-lg text-sm text-text-primary focus:border-accent-green focus:ring-2 focus:ring-accent-green/20 outline-none transition-all" required defaultValue={200} />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[13px] font-semibold text-text-secondary uppercase tracking-wide">Yağ (g)</label>
                    <input type="number" name="fat" className="w-full px-4 py-3 bg-white/5 border border-border-default rounded-lg text-sm text-text-primary focus:border-accent-green focus:ring-2 focus:ring-accent-green/20 outline-none transition-all" required defaultValue={70} />
                  </div>
                </div>
                <p className="text-sm text-text-muted mb-6 px-1 leading-relaxed">
                  Varsayılan öğünler (Kahvaltı, Öğle, Akşam, Ara Öğün) otomatik oluşturulacak. Daha sonra düzenleyebilirsiniz.
                </p>
                <div className="flex gap-4 justify-end pt-5 border-t border-border-default">
                  <button type="button" className="inline-flex items-center justify-center px-5 py-2.5 rounded-xl font-semibold text-sm bg-bg-glass border border-border-default text-text-primary hover:border-border-hover hover:bg-bg-card-hover transition-all" onClick={() => setShowDietModal(false)}>İptal</button>
                  <button type="submit" className="inline-flex items-center justify-center px-5 py-2.5 rounded-xl font-bold text-sm bg-gradient-to-br from-accent-green to-accent-cyan text-bg-primary shadow-glow hover:-translate-y-[1px] hover:shadow-[0_0_40px_rgba(0,245,160,0.25)] transition-all">Diyet Oluştur</button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/* ===== Canvas Component for Body Analysis ===== */
function AnalysisCanvas({ analysis }: { analysis: any }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      canvas.width = img.width;
      canvas.height = img.height;
      ctx.drawImage(img, 0, 0);

      // Draw landmarks
      if (analysis.landmarks && Array.isArray(analysis.landmarks)) {
        const connections = [
          [11, 12], [11, 13], [13, 15], [12, 14], [14, 16],
          [11, 23], [12, 24], [23, 24], [23, 25], [24, 26],
          [25, 27], [26, 28],
        ];

        // Draw connections
        ctx.strokeStyle = 'rgba(0, 245, 160, 0.6)';
        ctx.lineWidth = 2;
        connections.forEach(([i, j]) => {
          const a = analysis.landmarks[i];
          const b = analysis.landmarks[j];
          if (a && b && a.visibility > 0.5 && b.visibility > 0.5) {
            ctx.beginPath();
            ctx.moveTo(a.x * canvas.width, a.y * canvas.height);
            ctx.lineTo(b.x * canvas.width, b.y * canvas.height);
            ctx.stroke();
          }
        });

        // Draw landmark points
        analysis.landmarks.forEach((lm: any, idx: number) => {
          if (lm.visibility > 0.5) {
            const x = lm.x * canvas.width;
            const y = lm.y * canvas.height;

            ctx.beginPath();
            ctx.arc(x, y, 5, 0, Math.PI * 2);
            ctx.fillStyle = idx >= 23 ? '#00D9F5' : '#00F5A0';
            ctx.fill();
            ctx.strokeStyle = '#fff';
            ctx.lineWidth = 1.5;
            ctx.stroke();
          }
        });
      }

      // Draw custom markers
      if (analysis.customMarkers && Array.isArray(analysis.customMarkers)) {
        analysis.customMarkers.forEach((marker: any) => {
          ctx.beginPath();
          ctx.arc(marker.x * canvas.width, marker.y * canvas.height, 8, 0, Math.PI * 2);
          ctx.fillStyle = marker.type === 'joint' ? '#FF6B35' : '#7B61FF';
          ctx.fill();
          ctx.strokeStyle = '#fff';
          ctx.lineWidth = 2;
          ctx.stroke();

          if (marker.label) {
            ctx.font = '12px Inter';
            ctx.fillStyle = '#fff';
            ctx.fillText(marker.label, marker.x * canvas.width + 12, marker.y * canvas.height + 4);
          }
        });
      }
    };
    img.src = analysis.imageUrl;
  }, [analysis]);

  return (
    <div className="w-full h-full flex items-center justify-center">
      <canvas ref={canvasRef} className="max-w-full max-h-[80vh] object-contain rounded-xl shadow-lg border border-border-default/50" />
    </div>
  );
}
