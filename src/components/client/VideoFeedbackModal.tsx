import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useVoiceRecorder } from '@/hooks/useVoiceRecorder';
import { Button } from '@/components/ui/button';
import { VIDEO_STATUSES } from '@/lib/statusConfig';
import { X, Mic, Square, Play, RotateCcw, Send, Check, Loader2, Phone, MessageCircle, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import { useToast } from '@/hooks/use-toast';

interface FeedbackItem {
  id: string; content: string | null; type: string; is_resolved: boolean;
  timestamp_in_video: string | null; created_at: string;
}

interface VideoFeedbackModalProps {
  video: { id: string; title: string; client_id: string };
  onClose: () => void;
}

const PHONE = '6304980350';

export function VideoFeedbackModal({ video, onClose }: VideoFeedbackModalProps) {
  const { user } = useAuth();
  const [tab, setTab] = useState<'text' | 'voice'>('text');
  const [textFeedback, setTextFeedback] = useState('');
  const [timestamp, setTimestamp] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<FeedbackItem[]>([]);
  const { toast } = useToast();
  const voice = useVoiceRecorder(300);

  useEffect(() => {
    fetchFeedback();
    const channel = supabase
      .channel('feedback-modal')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'feedback', filter: `video_id=eq.${video.id}` }, fetchFeedback)
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [video.id]);

  const fetchFeedback = async () => {
    const { data } = await supabase.from('feedback').select('*').eq('video_id', video.id).order('created_at', { ascending: false });
    if (data) setFeedback(data);
  };

  const submitTextFeedback = async () => {
    if (!textFeedback.trim() || !user) return;
    setSubmitting(true);
    await supabase.from('feedback').insert({
      video_id: video.id, client_id: video.client_id,
      submitted_by: user.id, type: 'text',
      content: textFeedback.trim(),
      timestamp_in_video: timestamp || null,
    });
    setTextFeedback('');
    setTimestamp('');
    toast({ title: 'Feedback submitted!' });
    setSubmitting(false);
  };

  const submitVoiceFeedback = async () => {
    if (!voice.audioBlob || !user) return;
    setSubmitting(true);
    try {
      const fileName = `${video.id}/${Date.now()}.webm`;
      const { error } = await supabase.storage.from('voice-feedback').upload(fileName, voice.audioBlob, { contentType: 'audio/webm' });
      if (error) throw error;
      const { data: { publicUrl } } = supabase.storage.from('voice-feedback').getPublicUrl(fileName);
      await supabase.from('feedback').insert({
        video_id: video.id, client_id: video.client_id,
        submitted_by: user.id, type: 'voice',
        content: publicUrl,
        timestamp_in_video: timestamp || null,
      });
      voice.reset();
      toast({ title: 'Voice note sent!' });
    } catch {
      toast({ title: 'Failed to upload voice note', variant: 'destructive' });
    }
    setSubmitting(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-lg bg-sidebar border border-glass-border rounded-2xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="p-5 border-b border-glass-border flex items-start justify-between flex-shrink-0">
          <div>
            <h2 className="font-display font-bold text-foreground">{video.title}</h2>
            <p className="text-xs text-muted-foreground mt-0.5">Share your feedback with the Eka team</p>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground"><X size={20} /></button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-glass-border flex-shrink-0">
          {(['text', 'voice'] as const).map(t => (
            <button key={t} onClick={() => setTab(t)}
              className={cn('flex-1 py-3 text-sm font-medium transition-colors',
                tab === t ? 'text-primary border-b-2 border-primary' : 'text-muted-foreground hover:text-foreground'
              )}>
              {t === 'text' ? '✍️ Write Feedback' : '🎙️ Voice Message'}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto">
          <div className="p-5 space-y-4">
            {/* Timestamp */}
            <div>
              <label className="text-xs text-muted-foreground">Timestamp in video (optional)</label>
              <div className="flex items-center gap-2 mt-1">
                <Clock size={14} className="text-muted-foreground" />
                <input
                  type="text"
                  value={timestamp}
                  onChange={e => setTimestamp(e.target.value)}
                  placeholder="e.g. 1:23"
                  className="flex-1 bg-transparent border border-input rounded-md px-3 py-1.5 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:border-primary"
                />
              </div>
            </div>

            {tab === 'text' ? (
              <>
                <textarea
                  value={textFeedback}
                  onChange={e => setTextFeedback(e.target.value)}
                  placeholder="What did you think? Be as specific as possible — timestamps help!"
                  rows={4}
                  className="flex w-full rounded-xl border border-input bg-background px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground resize-none focus:border-primary outline-none"
                />
                <Button onClick={submitTextFeedback} disabled={!textFeedback.trim() || submitting} className="w-full gap-2">
                  {submitting ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                  Send Feedback
                </Button>
              </>
            ) : (
              <div className="space-y-4">
                {/* Waveform */}
                <div className="bg-muted/30 rounded-xl p-4 flex items-center justify-center h-20 gap-0.5">
                  {voice.levels.map((level, i) => (
                    <div
                      key={i}
                      className={cn('w-1 rounded-full transition-all duration-75', voice.state === 'recording' ? 'bg-primary' : 'bg-muted-foreground/40')}
                      style={{ height: `${Math.max(4, level * 56)}px` }}
                    />
                  ))}
                </div>

                {/* Timer */}
                <div className="text-center">
                  <span className={cn('text-2xl font-mono font-bold', voice.state === 'recording' ? 'text-primary' : 'text-foreground')}>
                    {voice.formatTime(voice.elapsed)}
                  </span>
                  <span className="text-xs text-muted-foreground ml-2">/ 5:00</span>
                </div>

                {/* Playback */}
                {voice.state === 'preview' && voice.audioUrl && (
                  <audio src={voice.audioUrl} controls className="w-full h-10" />
                )}

                {/* Controls */}
                <div className="flex gap-3 justify-center">
                  {voice.state === 'idle' && (
                    <Button onClick={voice.startRecording} className="gap-2 px-6">
                      <Mic size={16} /> Record
                    </Button>
                  )}
                  {voice.state === 'recording' && (
                    <Button onClick={voice.stopRecording} variant="destructive" className="gap-2 px-6">
                      <Square size={16} /> Stop
                    </Button>
                  )}
                  {voice.state === 'preview' && (
                    <>
                      <Button onClick={voice.reset} variant="outline" className="gap-2">
                        <RotateCcw size={14} /> Re-record
                      </Button>
                      <Button onClick={submitVoiceFeedback} disabled={submitting} className="gap-2">
                        {submitting ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
                        Send
                      </Button>
                    </>
                  )}
                </div>
              </div>
            )}

            {/* Contact buttons */}
            <div className="flex gap-2 pt-1">
              <a href={`tel:${PHONE}`} className="flex-1 flex items-center justify-center gap-2 py-2 border border-glass-border rounded-lg text-xs text-muted-foreground hover:text-foreground hover:bg-muted/30 transition-colors">
                <Phone size={13} /> Call Us
              </a>
              <a href={`https://wa.me/${PHONE}`} target="_blank" rel="noopener noreferrer" className="flex-1 flex items-center justify-center gap-2 py-2 border border-glass-border rounded-lg text-xs text-success hover:bg-success/10 transition-colors">
                <MessageCircle size={13} /> WhatsApp
              </a>
            </div>

            {/* Feedback history */}
            {feedback.length > 0 && (
              <div className="space-y-2 pt-2">
                <h3 className="text-sm font-semibold text-foreground">Previous Feedback</h3>
                {feedback.map(f => (
                  <div key={f.id} className={cn('p-3 rounded-xl text-sm', f.is_resolved ? 'bg-success/10 border border-success/20' : 'bg-muted/30')}>
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1">
                        {f.type === 'voice' ? (
                          <audio src={f.content || ''} controls className="w-full h-8" />
                        ) : (
                          <p className="text-foreground/90">{f.content}</p>
                        )}
                        {f.timestamp_in_video && (
                          <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1"><Clock size={10} />{f.timestamp_in_video}</p>
                        )}
                        <p className="text-xs text-muted-foreground mt-1">{formatDistanceToNow(new Date(f.created_at), { addSuffix: true })}</p>
                      </div>
                      {f.is_resolved && <Check size={14} className="text-success flex-shrink-0 mt-0.5" />}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
