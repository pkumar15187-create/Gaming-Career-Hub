import React, { useState, useRef } from 'react';
import { Upload, CheckCircle, FileText, X } from 'lucide-react';
import { supabase, isSupabaseConfigured } from '../lib/supabaseClient';

interface UploadFieldProps {
  id?: string;
  bucketName: 'profile_photos' | 'team_logos' | 'payment_screenshots' | 'sponsor_documents' | 'payment_qr' | 'profile_banners' | 'premium_badges' | 'premium_frames' | 'premium_stickers' | 'platinum_profile_themes';
  label: string;
  value: string;
  onChange: (url: string) => void;
  placeholder?: string;
}

export default function UploadField({
  id = 'upload-field',
  bucketName,
  label,
  value,
  onChange,
  placeholder = "Drag & drop file here, or click to browse"
}: UploadFieldProps) {
  const [isDragActive, setIsDragActive] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [fileName, setFileName] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setIsDragActive(true);
    } else if (e.type === "dragleave") {
      setIsDragActive(false);
    }
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      await processFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      await processFile(e.target.files[0]);
    }
  };

  const processFile = async (file: File) => {
    setFileName(file.name);
    setUploading(true);

    try {
      if (isSupabaseConfigured && supabase) {
        // Upload to Supabase Storage Bucket
        const fileExt = file.name.split('.').pop();
        const customPath = `${Date.now()}-${Math.floor(Math.random() * 100000)}.${fileExt}`;

        // Attempt upload
        let { data, error } = await supabase.storage
          .from(bucketName)
          .upload(customPath, file, {
            cacheControl: '3600',
            upsert: true
          });

        if (error && (error.message?.toLowerCase().includes('bucket') || (error as any).status === 404)) {
          try {
            console.warn(`Bucket ${bucketName} not found. Attempting to create bucket dynamically...`);
            await supabase.storage.createBucket(bucketName, { public: true });
            
            // Retry upload
            const retryResult = await supabase.storage
              .from(bucketName)
              .upload(customPath, file, {
                cacheControl: '3600',
                upsert: true
              });
            data = retryResult.data;
            error = retryResult.error;
          } catch (createErr) {
            console.error("Failed to dynamically self-heal/create bucket:", createErr);
          }
        }

        if (error) {
          throw error;
        }

        // Retrieve public URL
        const { data: { publicUrl } } = supabase.storage
          .from(bucketName)
          .getPublicUrl(customPath);

        onChange(publicUrl);
      } else {
        // Fallback: Read file as Base64 Data URL so local storage matches beautifully
        const reader = new FileReader();
        reader.onloadend = () => {
          if (typeof reader.result === 'string') {
            onChange(reader.result);
          }
        };
        reader.readAsDataURL(file);
      }
    } catch (err) {
      console.error("Failed uploading file to server. Standard Base64 backup applied.", err);
      // fallback
      const reader = new FileReader();
      reader.onloadend = () => {
        if (typeof reader.result === 'string') {
          onChange(reader.result);
        }
      };
      reader.readAsDataURL(file);
    } finally {
      setUploading(false);
    }
  };

  const clearFile = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setFileName('');
    onChange('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="space-y-1.5" id={`${id}-container`}>
      <label className="block text-[10px] font-mono tracking-widest text-zinc-500 uppercase font-bold">
        {label}
      </label>

      <div
        id={id}
        onDragEnter={handleDrag}
        onDragOver={handleDrag}
        onDragLeave={handleDrag}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`relative border-2 border-dashed rounded-xl p-4 text-center cursor-pointer transition-all ${
          isDragActive 
            ? 'border-amber-400 bg-amber-500/5' 
            : value 
              ? 'border-emerald-500/50 bg-emerald-500/5' 
              : 'border-zinc-800 bg-zinc-950/60 hover:border-zinc-750'
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          className="hidden"
          accept="image/*,application/pdf"
          onChange={handleFileChange}
        />

        {uploading ? (
          <div className="flex flex-col items-center justify-center py-2 space-y-2">
            <div className="w-5 h-5 border-2 border-amber-500 border-t-transparent rounded-full animate-spin"></div>
            <p className="text-[10px] font-mono text-zinc-400">Uploading telemetry package...</p>
          </div>
        ) : value ? (
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5 text-left min-w-0">
              {value.startsWith('data:image') || value.includes('http') ? (
                <img 
                  src={value} 
                  alt="preview" 
                  className="w-10 h-10 rounded-lg object-cover shrink-0 border border-zinc-800"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <div className="w-10 h-10 bg-zinc-900 border border-zinc-800 rounded-lg flex items-center justify-center shrink-0">
                  <FileText className="w-5 h-5 text-zinc-400" />
                </div>
              )}
              <div className="truncate">
                <p className="text-[11px] font-bold text-white truncate max-w-[200px]">
                  {fileName || "File uploaded successfully"}
                </p>
                <span className="text-[9px] font-mono text-zinc-500 uppercase">Package Ready</span>
              </div>
            </div>
            
            <button
              onClick={clearFile}
              className="p-1 px-2 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-400 hover:text-rose-400 font-bold transition-all text-xs"
              title="Clear file link"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        ) : (
          <div className="py-2.5 flex flex-col items-center justify-center space-y-1.5 text-zinc-400 hover:text-zinc-200">
            <Upload className="w-5 h-5 text-zinc-500" />
            <p className="text-[11px] font-mono tracking-tight font-medium">{placeholder}</p>
            <span className="text-[9px] font-mono text-zinc-650">Supports JPEG, PNG, or PDF up to 10MB</span>
          </div>
        )}
      </div>
    </div>
  );
}
