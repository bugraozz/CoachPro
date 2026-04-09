import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';

interface ChatProps {
  currentUserId: string;
  currentUserRole?: string;
  otherUserId: string;
  otherUserName: string;
  otherUserPhotoUrl?: string | null;
  otherUserRole?: string;
  showBackButton?: boolean;
  backHref?: string;
}

interface Message {
  id: string;
  content: string | null;
  messageType?: string;
  senderId: string;
  receiverId: string;
  fileUrl?: string | null;
  fileName?: string | null;
  fileMimeType?: string | null;
  fileSize?: number | null;
  read?: boolean;
  createdAt: string;
}

interface StudentProgramPreview {
  id: string;
  name: string;
  category?: string | null;
  status: string;
  days: Array<{
    id: string;
    dayName: string;
    order: number;
    exercises: Array<{
      id: string;
      name: string;
      muscleGroup: string;
      sets: number;
      reps: string;
      order: number;
    }>;
  }>;
}

interface StudentDietPreview {
  id: string;
  name: string;
  active: boolean;
  dailyCalorieTarget: number;
  proteinTarget: number;
  carbsTarget: number;
  fatTarget: number;
  meals: Array<{
    id: string;
    name: string;
    order: number;
    foods: Array<{
      id: string;
      name: string;
      amount: number;
      unit: string;
      calories: number;
    }>;
  }>;
}

interface StudentAnalysisPreview {
  id: string;
  date: string;
  imageUrl: string;
  postureScore?: number | null;
  postureNotes?: string | null;
  analysisType: string;
}

interface StudentWeightPoint {
  id: string;
  weight: number;
  date: string;
}

interface StudentPreviewData {
  id: string;
  name: string;
  email: string;
  role: string;
  phone?: string | null;
  gender?: string | null;
  age?: number | null;
  height?: number | null;
  currentWeight?: number | null;
  targetWeight?: number | null;
  healthNotes?: string | null;
  programs: StudentProgramPreview[];
  dietPlans: StudentDietPreview[];
  bodyAnalyses: StudentAnalysisPreview[];
  weightHistory: StudentWeightPoint[];
}

type PreviewModalType = 'program' | 'diet' | null;

const MAX_UPLOAD_SIZE = 10 * 1024 * 1024;
const ALLOWED_DOC_MIME_TYPES = new Set([
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'text/plain',
  'application/zip',
  'application/x-zip-compressed',
  'application/x-rar-compressed',
  'application/vnd.rar'
]);

function formatTime(dateString: string) {
  return new Date(dateString).toLocaleTimeString('tr-TR', {
    hour: '2-digit',
    minute: '2-digit'
  });
}

function toDateKey(dateString: string) {
  const date = new Date(dateString);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function toDateLabel(dateString: string) {
  const date = new Date(dateString);
  const now = new Date();
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);

  const dateKey = toDateKey(dateString);
  if (dateKey === toDateKey(now.toISOString())) return 'Bugün';
  if (dateKey === toDateKey(yesterday.toISOString())) return 'Dün';

  return date.toLocaleDateString('tr-TR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });
}

function formatFileSize(bytes?: number | null) {
  if (!bytes || bytes <= 0) return 'Bilinmiyor';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function isImageMimeType(mimeType?: string | null) {
  return Boolean(mimeType && mimeType.startsWith('image/'));
}

function getRoleLabel(role?: string) {
  if (role === 'coach') return 'Eğitmen';
  if (role === 'student') return 'Öğrenci';
  return role || '';
}

function calculateBmi(currentWeight?: number | null, height?: number | null) {
  if (!currentWeight || !height || height <= 0) return null;
  const bmi = currentWeight / ((height / 100) * (height / 100));
  return bmi.toFixed(1);
}

export default function ChatInterface({
  currentUserId,
  currentUserRole,
  otherUserId,
  otherUserName,
  otherUserPhotoUrl = null,
  otherUserRole,
  showBackButton = false,
  backHref = '/messages'
}: ChatProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [selectedFilePreviewUrl, setSelectedFilePreviewUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [cameraOpen, setCameraOpen] = useState(false);
  const [previewImageUrl, setPreviewImageUrl] = useState<string | null>(null);
  const [studentPreview, setStudentPreview] = useState<StudentPreviewData | null>(null);
  const [studentPreviewLoading, setStudentPreviewLoading] = useState(false);
  const [studentPreviewError, setStudentPreviewError] = useState<string | null>(null);
  const [activePreviewModal, setActivePreviewModal] = useState<PreviewModalType>(null);
  const [studentPanelOpen, setStudentPanelOpen] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraVideoRef = useRef<HTMLVideoElement>(null);
  const cameraStreamRef = useRef<MediaStream | null>(null);

  const roleLabel = getRoleLabel(otherUserRole);
  const coachStudentInsightsEnabled = currentUserRole === 'coach' && otherUserRole === 'student';

  const fetchStudentPreview = useCallback(async () => {
    if (!coachStudentInsightsEnabled) return;

    try {
      setStudentPreviewLoading(true);
      setStudentPreviewError(null);

      const res = await fetch(`/api/messages/student-preview/${otherUserId}`);
      const data = await res.json();

      if (!res.ok) {
        setStudentPreviewError(data?.error || 'Öğrenci bilgileri alınamadı.');
        return;
      }

      setStudentPreview(data);
    } catch (error) {
      console.error('Öğrenci önizleme verisi alınamadı:', error);
      setStudentPreviewError('Öğrenci bilgileri yüklenirken hata oluştu.');
    } finally {
      setStudentPreviewLoading(false);
    }
  }, [coachStudentInsightsEnabled, otherUserId]);

  const fetchMessages = async () => {
    try {
      const res = await fetch(`/api/messages/${otherUserId}`);
      const data = await res.json();
      if (res.ok && Array.isArray(data)) {
        setMessages(data);
      }
    } catch (e) {
      console.error('Mesajlar yüklenemedi', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setLoading(true);
    fetchMessages();
    const interval = setInterval(fetchMessages, 3000);
    return () => clearInterval(interval);
  }, [otherUserId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    if (!coachStudentInsightsEnabled) {
      setStudentPreview(null);
      setStudentPreviewError(null);
      setStudentPreviewLoading(false);
      setActivePreviewModal(null);
      setStudentPanelOpen(false);
      return;
    }

    fetchStudentPreview();
  }, [coachStudentInsightsEnabled, fetchStudentPreview]);

  const openPreviewModal = async (type: Exclude<PreviewModalType, null>) => {
    if (!studentPreview && !studentPreviewLoading) {
      await fetchStudentPreview();
    }
    setActivePreviewModal(type);
  };

  const stopCamera = useCallback(() => {
    if (cameraStreamRef.current) {
      cameraStreamRef.current.getTracks().forEach((track) => track.stop());
      cameraStreamRef.current = null;
    }
  }, []);

  useEffect(() => {
    if (cameraOpen && cameraVideoRef.current && cameraStreamRef.current) {
      cameraVideoRef.current.srcObject = cameraStreamRef.current;
    }
  }, [cameraOpen]);

  useEffect(() => {
    return () => {
      stopCamera();
      if (selectedFilePreviewUrl) {
        URL.revokeObjectURL(selectedFilePreviewUrl);
      }
    };
  }, [selectedFilePreviewUrl, stopCamera]);

  const clearSelectedFile = useCallback(() => {
    if (selectedFilePreviewUrl) {
      URL.revokeObjectURL(selectedFilePreviewUrl);
    }
    setSelectedFile(null);
    setSelectedFilePreviewUrl(null);
  }, [selectedFilePreviewUrl]);

  const applySelectedFile = useCallback(
    (file: File) => {
      if (file.size > MAX_UPLOAD_SIZE) {
        setErrorMessage('Dosya boyutu en fazla 10 MB olabilir.');
        return;
      }

      const image = file.type.startsWith('image/');
      const supportedDocument = ALLOWED_DOC_MIME_TYPES.has(file.type);
      if (!image && !supportedDocument) {
        setErrorMessage('Bu dosya türü desteklenmiyor.');
        return;
      }

      setErrorMessage(null);
      if (selectedFilePreviewUrl) {
        URL.revokeObjectURL(selectedFilePreviewUrl);
      }

      setSelectedFile(file);
      if (image) {
        setSelectedFilePreviewUrl(URL.createObjectURL(file));
      } else {
        setSelectedFilePreviewUrl(null);
      }
    },
    [selectedFilePreviewUrl]
  );

  const openCamera = async () => {
    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        setErrorMessage('Tarayıcı kamera erişimini desteklemiyor.');
        return;
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' },
        audio: false
      });

      cameraStreamRef.current = stream;
      setCameraOpen(true);
      setErrorMessage(null);
    } catch (error) {
      console.error('Kamera açılamadı:', error);
      setErrorMessage('Kamera açılamadı. Lütfen izinleri kontrol edin.');
    }
  };

  const closeCamera = () => {
    setCameraOpen(false);
    stopCamera();
  };

  const captureFromCamera = async () => {
    const video = cameraVideoRef.current;
    if (!video || video.videoWidth === 0 || video.videoHeight === 0) {
      setErrorMessage('Fotoğraf çekilemedi. Kamera görüntüsü hazır değil.');
      return;
    }

    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    const ctx = canvas.getContext('2d');
    if (!ctx) {
      setErrorMessage('Fotoğraf çekilemedi.');
      return;
    }

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    const blob = await new Promise<Blob | null>((resolve) => {
      canvas.toBlob(resolve, 'image/jpeg', 0.9);
    });

    if (!blob) {
      setErrorMessage('Fotoğraf oluşturulamadı.');
      return;
    }

    const file = new File([blob], `camera_${Date.now()}.jpg`, { type: 'image/jpeg' });
    applySelectedFile(file);
    closeCamera();
  };

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (sending) return;

    const trimmedMessage = newMessage.trim();
    if (!trimmedMessage && !selectedFile) return;

    setSending(true);
    setErrorMessage(null);

    try {
      let res: Response;

      if (selectedFile) {
        const formData = new FormData();
        formData.append('file', selectedFile);
        if (trimmedMessage) {
          formData.append('content', trimmedMessage);
        }
        res = await fetch(`/api/messages/${otherUserId}`, {
          method: 'POST',
          body: formData
        });
      } else {
        res = await fetch(`/api/messages/${otherUserId}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ content: trimmedMessage })
        });
      }

      const data = await res.json();

      if (!res.ok) {
        setErrorMessage(data?.error || 'Mesaj gönderilemedi.');
        return;
      }

      setMessages((prev) => [...prev, data]);
      setNewMessage('');
      clearSelectedFile();
    } catch (e) {
      console.error('Mesaj gönderilemedi', e);
      setErrorMessage('Mesaj gönderilirken bir hata oluştu.');
    } finally {
      setSending(false);
    }
  };

  const groupedMessages = useMemo(() => {
    const groups: Array<{ key: string; label: string; items: Message[] }> = [];
    const map = new Map<string, Message[]>();

    messages.forEach((message) => {
      const key = toDateKey(message.createdAt);
      const existing = map.get(key);
      if (existing) {
        existing.push(message);
      } else {
        map.set(key, [message]);
      }
    });

    Array.from(map.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .forEach(([key, items]) => {
        groups.push({
          key,
          label: toDateLabel(items[0].createdAt),
          items
        });
      });

    return groups;
  }, [messages]);

  const activeProgram = studentPreview?.programs?.[0] || null;
  const activeDiet = studentPreview?.dietPlans?.[0] || null;
  const bmiValue = calculateBmi(studentPreview?.currentWeight, studentPreview?.height);

  const getMessageType = (message: Message) => {
    if (message.messageType) return message.messageType;
    if (message.fileUrl) return isImageMimeType(message.fileMimeType) ? 'image' : 'file';
    return 'text';
  };

  const renderMessageContent = (message: Message, isMe: boolean) => {
    const type = getMessageType(message);

    if (type === 'image' && message.fileUrl) {
      return (
        <>
          <button
            type="button"
            onClick={() => setPreviewImageUrl(message.fileUrl || null)}
            className="block rounded-xl overflow-hidden border border-white/10"
          >
            <img
              src={message.fileUrl}
              alt={message.fileName || 'Fotoğraf'}
              className="w-full max-w-70 max-h-80 object-cover"
              loading="lazy"
            />
          </button>
          {message.content ? (
            <p className={`text-sm leading-relaxed whitespace-pre-wrap wrap-break-word mt-2 ${isMe ? 'text-white' : 'text-text-primary'}`}>
              {message.content}
            </p>
          ) : null}
        </>
      );
    }

    if (type === 'file' && message.fileUrl) {
      return (
        <>
          <a
            href={message.fileUrl}
            target="_blank"
            rel="noreferrer"
            className={`flex items-center gap-3 p-3 rounded-xl border ${
              isMe ? 'bg-white/10 border-white/20 hover:bg-white/15' : 'bg-bg-tertiary border-divider/40 hover:border-divider/70'
            } transition-colors`}
          >
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${isMe ? 'bg-white/20' : 'bg-accent-primary/15 text-accent-primary'}`}>
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/><path d="M16 13H8"/><path d="M16 17H8"/><path d="M10 9H8"/></svg>
            </div>
            <div className="min-w-0">
              <p className={`text-sm font-medium truncate ${isMe ? 'text-white' : 'text-text-primary'}`}>{message.fileName || 'Dosya'}</p>
              <p className={`text-xs ${isMe ? 'text-white/75' : 'text-text-muted'}`}>{formatFileSize(message.fileSize)}</p>
            </div>
          </a>
          {message.content ? (
            <p className={`text-sm leading-relaxed whitespace-pre-wrap wrap-break-word mt-2 ${isMe ? 'text-white' : 'text-text-primary'}`}>
              {message.content}
            </p>
          ) : null}
        </>
      );
    }

    return (
      <p className={`text-[15px] leading-relaxed whitespace-pre-wrap wrap-break-word ${isMe ? 'text-white' : 'text-text-primary'}`}>
        {message.content}
      </p>
    );
  };

  return (
    <div className="flex flex-col h-full w-full bg-bg-primary overflow-hidden relative">
      <div className="flex items-center justify-between gap-3 px-4 sm:px-6 py-3 sm:py-4 bg-bg-secondary border-b border-divider/40 z-10 sticky top-0 shadow-sm">
        <div className="flex items-center gap-3 min-w-0">
          {showBackButton ? (
            <a
              href={backHref}
              className="w-10 h-10 rounded-full flex items-center justify-center bg-bg-tertiary hover:bg-bg-tertiary/80 text-text-muted hover:text-text-primary transition-colors shrink-0"
              aria-label="Mesaj listesine dön"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>
            </a>
          ) : null}

          <button
            type="button"
            onClick={() => {
              if (coachStudentInsightsEnabled) setStudentPanelOpen(true);
            }}
            className={`flex items-center gap-3 min-w-0 text-left ${coachStudentInsightsEnabled ? 'cursor-pointer hover:opacity-90 transition-opacity' : ''}`}
            disabled={!coachStudentInsightsEnabled}
            aria-label="Öğrenci bilgilerini görüntüle"
          >
            <div className="relative shrink-0">
              {otherUserPhotoUrl ? (
                <img src={otherUserPhotoUrl} alt={otherUserName} className="w-12 h-12 rounded-full object-cover border border-divider/40" />
              ) : (
                <div className="w-12 h-12 rounded-full bg-linear-to-tr from-accent-primary to-accent-secondary flex items-center justify-center text-white font-bold text-lg shadow-md">
                  {otherUserName.charAt(0).toUpperCase()}
                </div>
              )}
              <div className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-green-500 rounded-full border-2 border-bg-secondary"></div>
            </div>

            <div className="min-w-0">
              <h3 className="font-semibold text-text-primary text-base truncate">{otherUserName}</h3>
              <p className="text-xs text-text-muted mt-0.5 truncate">
                {roleLabel ? `${roleLabel} • ` : ''}Çevrimiçi
              </p>
            </div>
          </button>
        </div>

        {coachStudentInsightsEnabled ? (
          <div className="hidden md:flex items-center gap-2 absolute left-1/2 -translate-x-1/2 bg-bg-primary/90 border border-divider/40 rounded-xl p-1 shadow-sm">
            <button
              type="button"
              onClick={() => openPreviewModal('program')}
              className="px-3 py-1.5 rounded-lg text-xs font-medium text-text-secondary hover:text-text-primary hover:bg-bg-tertiary transition-colors"
            >
              Program Önizleme
            </button>
            <button
              type="button"
              onClick={() => openPreviewModal('diet')}
              className="px-3 py-1.5 rounded-lg text-xs font-medium text-text-secondary hover:text-text-primary hover:bg-bg-tertiary transition-colors"
            >
              Diyet Önizleme
            </button>
          </div>
        ) : null}

        <div className="flex items-center gap-2 shrink-0">
          {coachStudentInsightsEnabled ? (
            <>
              <button
                type="button"
                onClick={() => openPreviewModal('program')}
                className="md:hidden w-9 h-9 rounded-lg bg-bg-primary border border-divider/50 text-text-secondary hover:text-text-primary transition-colors flex items-center justify-center"
                aria-label="Program önizlemesini aç"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 3h7v7H3z"/><path d="M14 3h7v7h-7z"/><path d="M14 14h7v7h-7z"/><path d="M3 14h7v7H3z"/></svg>
              </button>
              <button
                type="button"
                onClick={() => openPreviewModal('diet')}
                className="md:hidden w-9 h-9 rounded-lg bg-bg-primary border border-divider/50 text-text-secondary hover:text-text-primary transition-colors flex items-center justify-center"
                aria-label="Diyet önizlemesini aç"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 21a9 9 0 0 0 9-9H3a9 9 0 0 0 9 9Z"/><path d="M7 21h10"/></svg>
              </button>
              <button
                type="button"
                onClick={() => setStudentPanelOpen(true)}
                className="hidden sm:inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-bg-primary border border-divider/50 text-xs font-medium text-text-secondary hover:text-text-primary hover:border-divider transition-colors"
              >
                Öğrenci Profili
              </button>
            </>
          ) : null}
        </div>
      </div>

      <div
        className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6"
        style={{
          backgroundColor: 'var(--color-bg-primary)',
          backgroundImage: 'radial-gradient(rgba(148,163,184,0.12) 1px, transparent 1px)',
          backgroundSize: '22px 22px'
        }}
      >
        {loading ? (
          <div className="flex justify-center items-center h-full">
            <div className="w-8 h-8 border-4 border-accent-primary border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : messages.length > 0 ? (
          groupedMessages.map((group) => (
            <div key={group.key} className="space-y-6">
              <div className="flex justify-center">
                <span className="px-4 py-1.5 bg-bg-tertiary border border-divider/30 rounded-full text-[11px] font-medium text-text-secondary drop-shadow-sm backdrop-blur-md">
                  {group.label}
                </span>
              </div>
              {group.items.map((msg, index) => {
                const isMe = msg.senderId === currentUserId;
                const previousMessage = group.items[index - 1];
                const showAvatar = !isMe && (!previousMessage || previousMessage.senderId !== msg.senderId);
                const type = getMessageType(msg);

                return (
                  <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'} items-end gap-2 group`}>
                    {!isMe && showAvatar && (
                      <div className="w-8 h-8 rounded-full bg-accent-secondary/20 flex items-center justify-center text-accent-secondary font-bold text-xs shrink-0 self-end mb-1">
                        {otherUserName.charAt(0).toUpperCase()}
                      </div>
                    )}
                    {!isMe && !showAvatar && <div className="w-8 shrink-0"></div>}

                    <div className={`relative max-w-[78%] shadow-md ${
                      isMe 
                        ? 'bg-linear-to-br from-accent-primary to-blue-600 text-white rounded-2xl rounded-tr-sm' 
                        : 'bg-bg-secondary border border-divider/50 text-text-primary rounded-2xl rounded-tl-sm'
                    } ${type === 'image' ? 'p-2.5' : 'px-4 py-3'} transform transition-all duration-300 ease-out animate-in fade-in slide-in-from-bottom-2`}>
                      {renderMessageContent(msg, isMe)}

                      <div className={`flex items-center gap-1.5 mt-1.5 ${isMe ? 'justify-end' : 'justify-start'}`}>
                        <span className={`text-[10px] font-medium ${isMe ? 'text-white/80' : 'text-text-muted'}`}>
                          {formatTime(msg.createdAt)}
                        </span>
                        {isMe && (
                          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-white/80">
                            <path d="M18 6 7 17l-5-5"/>
                            <path d="m22 10-7.5 7.5L13 16"/>
                          </svg>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ))
        ) : (
          <div className="flex flex-col justify-center items-center h-full text-text-muted gap-4 opacity-70">
            <div className="w-20 h-20 bg-bg-tertiary rounded-full flex items-center justify-center border border-divider/50 shadow-inner">
              <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-accent-primary"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
            </div>
            <div className="text-center">
              <p className="text-base font-medium text-text-primary mb-1">{otherUserName} ile sohbete başla</p>
              <p className="text-sm">Gönderdiğin tüm mesajlar uçtan uca korunur.</p>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} className="h-2" />
      </div>

      <div className="p-4 bg-bg-secondary border-t border-divider/40">
        {errorMessage ? (
          <div className="mb-3 rounded-xl border border-red-500/30 bg-red-500/10 text-red-300 text-sm px-4 py-2">
            {errorMessage}
          </div>
        ) : null}

        {selectedFile ? (
          <div className="mb-3 rounded-xl border border-divider/50 bg-bg-primary p-3 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              {selectedFilePreviewUrl ? (
                <img src={selectedFilePreviewUrl} alt="Önizleme" className="w-14 h-14 rounded-lg object-cover border border-divider/40" />
              ) : (
                <div className="w-14 h-14 rounded-lg bg-bg-tertiary border border-divider/40 flex items-center justify-center text-text-muted">
                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/></svg>
                </div>
              )}
              <div className="min-w-0">
                <p className="text-sm font-medium text-text-primary truncate">{selectedFile.name}</p>
                <p className="text-xs text-text-muted">{formatFileSize(selectedFile.size)}</p>
              </div>
            </div>
            <button
              type="button"
              onClick={clearSelectedFile}
              className="text-text-muted hover:text-text-primary transition-colors"
              aria-label="Ek dosyayı kaldır"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
            </button>
          </div>
        ) : null}

        <form onSubmit={sendMessage} className="flex gap-3 items-end max-w-5xl mx-auto relative group">
          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.zip,.rar"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) applySelectedFile(file);
              event.currentTarget.value = '';
            }}
          />

          <div className="flex gap-2 pb-1">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="h-11.5 w-11.5 rounded-xl bg-bg-primary border border-divider/60 text-text-secondary hover:text-text-primary hover:border-divider transition-colors flex items-center justify-center"
              aria-label="Dosya veya fotoğraf ekle"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21.44 11.05 12.25 20.24a6 6 0 0 1-8.49-8.49l9.2-9.19a4 4 0 0 1 5.65 5.65l-9.2 9.2a2 2 0 0 1-2.83-2.83l8.49-8.48"/></svg>
            </button>

            <button
              type="button"
              onClick={openCamera}
              className="h-11.5 w-11.5 rounded-xl bg-bg-primary border border-divider/60 text-text-secondary hover:text-text-primary hover:border-divider transition-colors flex items-center justify-center"
              aria-label="Kamera aç"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3Z"/><circle cx="12" cy="13" r="3"/></svg>
            </button>
          </div>

          <div className="flex-1 relative bg-bg-primary rounded-2xl border border-divider/60 shadow-sm focus-within:border-accent-primary focus-within:ring-2 focus-within:ring-accent-primary/20 transition-all duration-300">
            <input
              type="text"
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder={selectedFile ? 'Dosyaya bir not ekleyin (opsiyonel)...' : 'Mesaj yazın...'}
              className="w-full bg-transparent px-5 py-4 pr-12 text-[15px] focus:outline-none text-text-primary placeholder:text-text-muted"
              autoComplete="off"
            />
          </div>

          <button
            type="submit"
            disabled={sending || (!newMessage.trim() && !selectedFile)}
            className="h-13.5 px-6 bg-accent-primary text-white rounded-2xl font-semibold shadow-md shadow-accent-primary/20 hover:bg-accent-primary/90 hover:scale-[1.02] active:scale-[0.98] transition-all duration-200 disabled:opacity-50 disabled:pointer-events-none flex items-center justify-center gap-2"
          >
            {sending ? (
              <div className="w-4 h-4 border-2 border-white/80 border-t-transparent rounded-full animate-spin"></div>
            ) : (
              <>
                <span className="hidden sm:inline">Gönder</span>
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m22 2-7 20-4-9-9-4Z"/><path d="M22 2 11 13"/></svg>
              </>
            )}
          </button>
        </form>
      </div>

      {activePreviewModal ? (
        <div className="fixed inset-0 z-120 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setActivePreviewModal(null)}>
          <div className="w-full max-w-3xl max-h-[88vh] bg-bg-secondary border border-divider/50 rounded-2xl overflow-hidden shadow-2xl" onClick={(event) => event.stopPropagation()}>
            <div className="px-5 py-4 border-b border-divider/40 flex items-center justify-between">
              <h4 className="text-base font-semibold text-text-primary">
                {activePreviewModal === 'program' ? 'Program Önizleme' : 'Diyet Önizleme'}
              </h4>
              <button
                type="button"
                onClick={() => setActivePreviewModal(null)}
                className="text-text-muted hover:text-text-primary transition-colors"
                aria-label="Önizlemeyi kapat"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
              </button>
            </div>

            <div className="p-5 overflow-y-auto max-h-[calc(88vh-72px)]">
              {studentPreviewLoading ? (
                <div className="flex justify-center py-10">
                  <div className="w-7 h-7 border-4 border-accent-primary border-t-transparent rounded-full animate-spin"></div>
                </div>
              ) : studentPreviewError ? (
                <div className="rounded-xl border border-red-500/30 bg-red-500/10 text-red-300 text-sm px-4 py-3">
                  {studentPreviewError}
                </div>
              ) : activePreviewModal === 'program' ? (
                activeProgram ? (
                  <div className="space-y-4">
                    <div className="p-4 rounded-xl border border-divider/40 bg-bg-primary">
                      <h5 className="text-lg font-semibold text-text-primary">{activeProgram.name}</h5>
                      <p className="text-xs text-text-muted mt-1">
                        {activeProgram.category || 'Genel'} • {activeProgram.days.length} gün
                      </p>
                    </div>
                    <div className="space-y-3">
                      {activeProgram.days.map((day) => (
                        <div key={day.id} className="p-4 rounded-xl border border-divider/40 bg-bg-primary">
                          <div className="flex items-center justify-between mb-2">
                            <h6 className="text-sm font-semibold text-text-primary">{day.dayName}</h6>
                            <span className="text-xs text-text-muted">{day.exercises.length} egzersiz</span>
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            {day.exercises.slice(0, 6).map((exercise) => (
                              <div key={exercise.id} className="text-xs px-2.5 py-2 rounded-lg bg-bg-tertiary text-text-secondary">
                                <span className="font-medium text-text-primary">{exercise.name}</span>
                                <span className="ml-1">{exercise.sets}x{exercise.reps}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="text-sm text-text-muted py-8 text-center">Aktif program bulunamadı.</div>
                )
              ) : activeDiet ? (
                <div className="space-y-4">
                  <div className="p-4 rounded-xl border border-divider/40 bg-bg-primary">
                    <h5 className="text-lg font-semibold text-text-primary">{activeDiet.name}</h5>
                    <div className="mt-2 flex flex-wrap gap-2 text-xs">
                      <span className="px-2.5 py-1 rounded-lg bg-bg-tertiary text-text-secondary">{activeDiet.dailyCalorieTarget} kcal</span>
                      <span className="px-2.5 py-1 rounded-lg bg-bg-tertiary text-text-secondary">P: {activeDiet.proteinTarget}g</span>
                      <span className="px-2.5 py-1 rounded-lg bg-bg-tertiary text-text-secondary">K: {activeDiet.carbsTarget}g</span>
                      <span className="px-2.5 py-1 rounded-lg bg-bg-tertiary text-text-secondary">Y: {activeDiet.fatTarget}g</span>
                    </div>
                  </div>
                  <div className="space-y-3">
                    {activeDiet.meals.map((meal) => (
                      <div key={meal.id} className="p-4 rounded-xl border border-divider/40 bg-bg-primary">
                        <h6 className="text-sm font-semibold text-text-primary mb-2">{meal.name}</h6>
                        <div className="space-y-1.5">
                          {meal.foods.slice(0, 6).map((food) => (
                            <div key={food.id} className="flex items-center justify-between text-xs px-2.5 py-2 rounded-lg bg-bg-tertiary text-text-secondary">
                              <span className="truncate">{food.name}</span>
                              <span className="shrink-0">{food.amount} {food.unit} • {food.calories} kcal</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="text-sm text-text-muted py-8 text-center">Aktif diyet planı bulunamadı.</div>
              )}
            </div>
          </div>
        </div>
      ) : null}

      {studentPanelOpen ? (
        <div className="fixed inset-0 z-130 bg-black/65 backdrop-blur-sm" onClick={() => setStudentPanelOpen(false)}>
          <aside className="ml-auto h-full w-full max-w-2xl bg-bg-secondary border-l border-divider/40 shadow-2xl overflow-y-auto" onClick={(event) => event.stopPropagation()}>
            <div className="sticky top-0 px-5 py-4 border-b border-divider/40 bg-bg-secondary z-10 flex items-center justify-between">
              <div>
                <h4 className="text-base font-semibold text-text-primary">Öğrenci Bilgi Paneli</h4>
                <p className="text-xs text-text-muted mt-0.5">Sohbetten ayrılmadan tüm veriler</p>
              </div>
              <button
                type="button"
                onClick={() => setStudentPanelOpen(false)}
                className="text-text-muted hover:text-text-primary transition-colors"
                aria-label="Paneli kapat"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
              </button>
            </div>

            <div className="p-5 space-y-5">
              {studentPreviewLoading ? (
                <div className="flex justify-center py-12">
                  <div className="w-7 h-7 border-4 border-accent-primary border-t-transparent rounded-full animate-spin"></div>
                </div>
              ) : studentPreviewError ? (
                <div className="rounded-xl border border-red-500/30 bg-red-500/10 text-red-300 text-sm px-4 py-3">{studentPreviewError}</div>
              ) : studentPreview ? (
                <>
                  <section className="p-4 rounded-xl border border-divider/40 bg-bg-primary">
                    <h5 className="text-base font-semibold text-text-primary">{studentPreview.name}</h5>
                    <p className="text-xs text-text-muted mt-1">{studentPreview.email}</p>
                    <div className="grid grid-cols-2 gap-2 mt-4 text-xs">
                      <div className="px-3 py-2 rounded-lg bg-bg-tertiary text-text-secondary">Kilo: <span className="text-text-primary font-medium">{studentPreview.currentWeight || '—'} kg</span></div>
                      <div className="px-3 py-2 rounded-lg bg-bg-tertiary text-text-secondary">Hedef: <span className="text-text-primary font-medium">{studentPreview.targetWeight || '—'} kg</span></div>
                      <div className="px-3 py-2 rounded-lg bg-bg-tertiary text-text-secondary">Boy: <span className="text-text-primary font-medium">{studentPreview.height || '—'} cm</span></div>
                      <div className="px-3 py-2 rounded-lg bg-bg-tertiary text-text-secondary">BMI: <span className="text-text-primary font-medium">{bmiValue || '—'}</span></div>
                    </div>
                  </section>

                  <section className="p-4 rounded-xl border border-divider/40 bg-bg-primary">
                    <div className="flex items-center justify-between mb-3">
                      <h6 className="text-sm font-semibold text-text-primary">Programlar</h6>
                      <span className="text-xs text-text-muted">{studentPreview.programs.length} aktif</span>
                    </div>
                    {studentPreview.programs.length > 0 ? (
                      <div className="space-y-2">
                        {studentPreview.programs.map((program) => (
                          <div key={program.id} className="px-3 py-2 rounded-lg bg-bg-tertiary text-xs text-text-secondary">
                            <p className="font-medium text-text-primary">{program.name}</p>
                            <p className="mt-1">{program.days.length} gün • {program.days.reduce((sum, day) => sum + day.exercises.length, 0)} egzersiz</p>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-text-muted">Aktif program yok.</p>
                    )}
                  </section>

                  <section className="p-4 rounded-xl border border-divider/40 bg-bg-primary">
                    <div className="flex items-center justify-between mb-3">
                      <h6 className="text-sm font-semibold text-text-primary">Diyet Planları</h6>
                      <span className="text-xs text-text-muted">{studentPreview.dietPlans.length} aktif</span>
                    </div>
                    {studentPreview.dietPlans.length > 0 ? (
                      <div className="space-y-2">
                        {studentPreview.dietPlans.map((diet) => (
                          <div key={diet.id} className="px-3 py-2 rounded-lg bg-bg-tertiary text-xs text-text-secondary">
                            <p className="font-medium text-text-primary">{diet.name}</p>
                            <p className="mt-1">{diet.dailyCalorieTarget} kcal • P:{diet.proteinTarget} K:{diet.carbsTarget} Y:{diet.fatTarget}</p>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-text-muted">Aktif diyet planı yok.</p>
                    )}
                  </section>

                  <section className="p-4 rounded-xl border border-divider/40 bg-bg-primary">
                    <h6 className="text-sm font-semibold text-text-primary mb-3">Vücut Analizi</h6>
                    {studentPreview.bodyAnalyses.length > 0 ? (
                      <div className="space-y-2">
                        {studentPreview.bodyAnalyses.map((analysis) => (
                          <div key={analysis.id} className="flex items-center gap-3 px-3 py-2 rounded-lg bg-bg-tertiary">
                            <img src={analysis.imageUrl} alt="Analiz" className="w-14 h-14 rounded-lg object-cover border border-divider/40" />
                            <div className="min-w-0">
                              <p className="text-xs text-text-primary font-medium">{new Date(analysis.date).toLocaleDateString('tr-TR')}</p>
                              <p className="text-xs text-text-muted">Skor: {analysis.postureScore ?? '—'} • Tip: {analysis.analysisType}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-text-muted">Vücut analizi verisi bulunamadı.</p>
                    )}
                  </section>

                  <section className="p-4 rounded-xl border border-divider/40 bg-bg-primary">
                    <h6 className="text-sm font-semibold text-text-primary mb-3">Gelişim Takibi (Kilo)</h6>
                    {studentPreview.weightHistory.length > 0 ? (
                      <div className="space-y-1.5">
                        {studentPreview.weightHistory.slice(0, 8).map((record) => (
                          <div key={record.id} className="flex items-center justify-between px-3 py-2 rounded-lg bg-bg-tertiary text-xs">
                            <span className="text-text-secondary">{new Date(record.date).toLocaleDateString('tr-TR')}</span>
                            <span className="font-medium text-text-primary">{record.weight} kg</span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-text-muted">Kilo geçmişi bulunamadı.</p>
                    )}
                  </section>

                  <section className="p-4 rounded-xl border border-divider/40 bg-bg-primary">
                    <h6 className="text-sm font-semibold text-text-primary mb-2">Sağlık Notları</h6>
                    <p className="text-xs text-text-secondary leading-relaxed">{studentPreview.healthNotes || 'Özel sağlık notu girilmemiş.'}</p>
                  </section>

                  <a href={`/students/${studentPreview.id}`} className="w-full inline-flex justify-center items-center px-4 py-3 rounded-xl bg-accent-primary text-white text-sm font-medium hover:bg-accent-primary/90 transition-colors">
                    Öğrenci Detay Sayfasını Aç
                  </a>
                </>
              ) : (
                <div className="text-sm text-text-muted">Öğrenci verisi bulunamadı.</div>
              )}
            </div>
          </aside>
        </div>
      ) : null}

      {cameraOpen ? (
        <div className="fixed inset-0 z-100 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-2xl bg-bg-secondary border border-divider/50 rounded-2xl overflow-hidden shadow-2xl">
            <div className="px-4 py-3 border-b border-divider/40 flex items-center justify-between">
              <h4 className="text-sm font-semibold text-text-primary">Kameradan Fotoğraf Çek</h4>
              <button
                type="button"
                onClick={closeCamera}
                className="text-text-muted hover:text-text-primary transition-colors"
                aria-label="Kamerayı kapat"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
              </button>
            </div>

            <div className="p-4">
              <video ref={cameraVideoRef} autoPlay playsInline muted className="w-full rounded-xl bg-black aspect-video object-cover" />
            </div>

            <div className="p-4 pt-0 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={closeCamera}
                className="px-4 py-2 rounded-xl border border-divider/50 text-text-secondary hover:text-text-primary hover:bg-bg-tertiary transition-colors"
              >
                Vazgeç
              </button>
              <button
                type="button"
                onClick={captureFromCamera}
                className="px-4 py-2 rounded-xl bg-accent-primary text-white hover:bg-accent-primary/90 transition-colors"
              >
                Fotoğraf Çek
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {previewImageUrl ? (
        <div className="fixed inset-0 z-110 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setPreviewImageUrl(null)}>
          <div className="max-w-5xl max-h-[90vh] relative" onClick={(event) => event.stopPropagation()}>
            <button
              type="button"
              onClick={() => setPreviewImageUrl(null)}
              className="absolute -top-10 right-0 text-white/80 hover:text-white"
              aria-label="Önizlemeyi kapat"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
            </button>
            <img src={previewImageUrl} alt="Fotoğraf önizleme" className="max-w-full max-h-[90vh] rounded-xl shadow-2xl" />
          </div>
        </div>
      ) : null}
    </div>
  );
}
