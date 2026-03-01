import { useState, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useVoiceRecorder } from '@/hooks/useVoiceRecorder';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import {
  Mic, Square, RotateCcw, Send, Loader2, X, ImagePlus, CheckCircle, Lightbulb
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface IdeaSubmissionFormProps {
  clientId: string;
  onSuccess: () => void;
  onCancel?: () => void;
}

export function IdeaSubmissionForm({ clientId, onSuccess, onCancel }: IdeaSubmissionFormProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const voice = useVoiceRecorder(300);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [photos, setPhotos] = useState<File[]>([]);
  const [photoPreviews, setPhotoPreviews] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handlePhotos = (files: FileList | null) => {
    if (!files) return;
    const newFiles = Array.from(files).filter(f => {
      if (f.size > 10 * 1024 * 1024) { toast({ title: `${f.name} exceeds 10MB`, variant: 'destructive' }); return false; }
      if (!['image/jpeg', 'image/png', 'image/webp', 'image/gif'].includes(f.type)) { toast({ title: `${f.name} is not a supported format`, variant: 'destructive' }); return false; }
      return true;
    });
    const total = photos.length + newFiles.length;
    if (total > 5) { toast({ title: 'Maximum 5 images allowed', variant: 'destructive' }); return; }
    const previews = newFiles.map(f => URL.createObjectURL(f));
    setPhotos(prev => [...prev, ...newFiles]);
    setPhotoPreviews(prev => [...prev, ...previews]);
  };

  const removePhoto = (idx: number) => {
    URL.revokeObjectURL(photoPreviews[idx]);
    setPhotos(prev => prev.filter((_, i) => i !== idx));
    setPhotoPreviews(prev => prev.filter((_, i) => i !== idx));
  };

  const handleSubmit = async () => {
    if (!title.trim() || !user) return;
    setSubmitting(true);
    try {
      const ideaId = crypto.randomUUID();

      // Upload voice note if exists
      let voiceUrl: string | null = null;
      let voiceDuration: number | null = null;
      if (voice.audioBlob && voice.state === 'preview') {
        const vName = `client-ideas/${clientId}_${ideaId}_${Date.now()}.webm`;
        const { error } = await supabase.storage.from('voice-feedback').upload(vName, voice.audioBlob, { contentType: 'audio/webm' });
        if (error) throw error;
        const { data: { publicUrl } } = supabase.storage.from('voice-feedback').getPublicUrl(vName);
        voiceUrl = publicUrl;
        voiceDuration = voice.elapsed;
      }

      // Upload photos
      const photoUrls: string[] = [];
      for (const photo of photos) {
        const ext = photo.name.split('.').pop();
        const pName = `${clientId}/${ideaId}/${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`;
        const { error } = await supabase.storage.from('client-idea-images').upload(pName, photo, { contentType: photo.type });
        if (error) throw error;
        const { data: { publicUrl } } = supabase.storage.from('client-idea-images').getPublicUrl(pName);
        photoUrls.push(publicUrl);
      }

      // Insert idea
      const { error: insertErr } = await supabase.from('client_ideas' as any).insert({
        id: ideaId,
        client_id: clientId,
        submitted_by: user.id,
        title: title.trim(),
        description: description.trim() || null,
        voice_note_url: voiceUrl,
        voice_duration_seconds: voiceDuration,
        photo_urls: photoUrls.length > 0 ? photoUrls : [],
        status: 'submitted',
      } as any);
      if (insertErr) throw insertErr;

      // Send notification to admin(s)
      const { data: admins } = await supabase.from('user_roles').select('user_id').eq('role', 'admin');
      const { data: clientData } = await supabase.from('clients').select('name').eq('id', clientId).single();
      if (admins) {
        for (const admin of admins) {
          await supabase.from('notifications').insert({
            recipient_id: admin.user_id,
            type: 'idea',
            message: `💡 ${clientData?.name || 'A client'} submitted a new idea: "${title.trim()}"`,
            related_client_id: clientId,
          });
        }
      }

      setSubmitted(true);
      voice.reset();
      toast({ title: '✅ Idea submitted!' });
    } catch (err: any) {
      toast({ title: 'Failed to submit idea', description: err.message, variant: 'destructive' });
    }
    setSubmitting(false);
  };

  const resetForm = () => {
    setTitle('');
    setDescription('');
    setPhotos([]);
    setPhotoPreviews([]);
    voice.reset();
    setSubmitted(false);
  };

  if (submitted) {
    return (
      <div className="glass-card p-8 text-center space-y-4 max-w-lg mx-auto">
        <CheckCircle size={48} className="mx-auto text-success" />
        <h2 className="text-xl font-display font-bold text-foreground">Idea submitted!</h2>
        <p className="text-muted-foreground text-sm">
          We've received your idea and will review it shortly. You'll hear from us soon!
        </p>
        <div className="flex gap-3 justify-center pt-2">
          <Button onClick={resetForm} className="gap-2 bg-gradient-to-r from-primary to-primary/80">
            <Lightbulb size={16} /> Submit Another Idea
          </Button>
          {onCancel && (
            <Button variant="outline" onClick={onCancel}>Close</Button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      {/* Title */}
      <div className="space-y-2">
        <label className="text-sm font-medium text-foreground">What's your idea called? <span className="text-destructive">*</span></label>
        <input
          type="text" value={title} onChange={e => setTitle(e.target.value)}
          placeholder="e.g. Behind the Scenes video, Product Launch Reel, Customer Testimonial"
          className="flex h-12 w-full rounded-xl border border-input bg-background px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary outline-none"
        />
      </div>

      {/* Description */}
      <div className="space-y-2">
        <label className="text-sm font-medium text-foreground">Tell us about your idea</label>
        <textarea
          value={description} onChange={e => setDescription(e.target.value)}
          placeholder="Describe what you have in mind — the concept, the message you want to convey, who it's for, any references you like. The more detail you give us, the better we can execute it."
          rows={6}
          className="flex w-full rounded-xl border border-input bg-background px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground resize-none focus:border-primary outline-none"
          style={{ minHeight: '150px' }}
        />
      </div>

      {/* Voice Note */}
      <div className="space-y-2">
        <label className="text-sm font-medium text-foreground">Prefer to explain it out loud?</label>
        <p className="text-xs text-muted-foreground">Sometimes it's easier to just talk through your idea. Record a voice note up to 5 minutes.</p>
        <div className="glass-card p-5 space-y-4">
          {/* Waveform */}
          <div className="bg-muted/20 rounded-xl p-4 flex items-center justify-center h-16 gap-0.5">
            {voice.levels.map((level, i) => (
              <div key={i}
                className={cn('w-1 rounded-full transition-all duration-75', voice.state === 'recording' ? 'bg-primary' : 'bg-muted-foreground/20')}
                style={{ height: `${Math.max(3, level * 48)}px` }} />
            ))}
          </div>
          <div className="text-center">
            <span className={cn('text-2xl font-mono font-bold', voice.state === 'recording' ? 'text-primary' : 'text-foreground')}>
              {voice.formatTime(voice.elapsed)}
            </span>
            <span className="text-xs text-muted-foreground ml-2">/ 5:00</span>
          </div>
          {voice.state === 'preview' && voice.audioUrl && (
            <div className="p-3 bg-muted/20 rounded-xl">
              <audio src={voice.audioUrl} controls className="w-full h-10" />
            </div>
          )}
          <div className="flex gap-3 justify-center">
            {voice.state === 'idle' && (
              <button onClick={voice.startRecording}
                className="h-14 w-14 rounded-full bg-primary hover:bg-primary/90 text-primary-foreground flex items-center justify-center shadow-lg transition-all hover:scale-105">
                <Mic size={22} />
              </button>
            )}
            {voice.state === 'recording' && (
              <button onClick={voice.stopRecording}
                className="h-14 w-14 rounded-full bg-destructive hover:bg-destructive/90 text-destructive-foreground flex items-center justify-center shadow-lg animate-pulse">
                <Square size={22} />
              </button>
            )}
            {voice.state === 'preview' && (
              <>
                <Button onClick={voice.reset} variant="outline" size="sm" className="gap-2">
                  <RotateCcw size={14} /> Re-record
                </Button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Photo Upload */}
      <div className="space-y-2">
        <label className="text-sm font-medium text-foreground">Got a reference image or photo?</label>
        <p className="text-xs text-muted-foreground">Upload any images that inspired this idea — screenshots, competitor content, mood board photos, product photos, anything that helps us understand your vision.</p>
        <div
          className={cn(
            'border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors hover:border-primary/50 hover:bg-primary/5',
            photos.length >= 5 ? 'opacity-50 pointer-events-none' : 'border-muted-foreground/30'
          )}
          onClick={() => fileInputRef.current?.click()}
          onDragOver={e => { e.preventDefault(); e.stopPropagation(); }}
          onDrop={e => { e.preventDefault(); e.stopPropagation(); handlePhotos(e.dataTransfer.files); }}
        >
          <ImagePlus size={32} className="mx-auto text-muted-foreground/50 mb-2" />
          <p className="text-sm text-muted-foreground">Drop images here or click to browse</p>
          <p className="text-xs text-muted-foreground/70 mt-1">JPG, PNG, WebP, GIF · Max 10MB each · Up to 5 images</p>
        </div>
        <input
          ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp,image/gif"
          multiple className="hidden"
          onChange={e => handlePhotos(e.target.files)}
        />
        {photoPreviews.length > 0 && (
          <div className="flex gap-3 flex-wrap mt-3">
            {photoPreviews.map((src, idx) => (
              <div key={idx} className="relative group">
                <img src={src} alt={`Reference ${idx + 1}`} className="h-20 w-20 rounded-lg object-cover border border-border" />
                <button onClick={() => removePhoto(idx)}
                  className="absolute -top-2 -right-2 h-5 w-5 bg-destructive text-destructive-foreground rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                  <X size={12} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Submit */}
      <Button
        onClick={handleSubmit}
        disabled={!title.trim() || submitting}
        className="w-full gap-2 h-[52px] text-base bg-gradient-to-r from-primary to-primary/80"
      >
        {submitting ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
        Submit My Idea →
      </Button>
    </div>
  );
}
