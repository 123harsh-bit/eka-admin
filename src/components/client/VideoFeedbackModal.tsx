import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useVoiceRecorder } from '@/hooks/useVoiceRecorder';
import { Button } from '@/components/ui/button';
import { X, Mic, Square, RotateCcw, Send, Check, Loader2, Phone, MessageCircle, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format, formatDistanceToNow } from 'date-fns';
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-2xl bg-sidebar border border-glass-border rounded-2xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="p-6 border-b border-glass-border flex items-start justify-between flex-shrink-0">
          <div>
            <h2 className="text-lg font-display font-bold text-foreground">{video.title}</h2>
            <p className="text-sm text-muted-foreground mt-1">Share your feedback with the Eka team</p>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground p-1"><X size={22} /></button>
        </div>

        {/* Tabs - large pill style */}
        <div className="flex gap-2 p-4 border-b border-glass-border flex-shrink-0">
          {(['text', 'voice'] as const).map(t => (
            <button key={t} onClick={() => setTab(t)}
              className={cn('flex-1 py-3 px-4 rounded-xl text-sm font-semibold transition-all flex items-center justify-center gap-2',
                tab === t ? 'bg-primary text-primary-foreground shadow-lg' : 'bg-muted/30 text-muted-foreground hover:bg-muted/50'
              )}>
              {t === 'text' ? <><Send size={16} /> Write Feedback</> : <><Mic size={16} /> Voice Message</>}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto">
          <div className="p-6 space-y-5">
            {/* Timestamp */}
            <div>
              <label className="text-sm font-medium text-foreground">Timestamp in video (optional)</label>
              <div className="flex items-center gap-2 mt-1.5">
                <Clock size={16} className="text-muted-foreground" />
                <input
                  type="text" value={timestamp} onChange={e => setTimestamp(e.target.value)}
                  placeholder="e.g. 1:23"
                  className="flex-1 bg-transparent border border-input rounded-xl px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:border-primary min-h-[48px]"
                />
              </div>
              <p className="text-xs text-muted-foreground mt-1.5">Example: '0:32' means something at 32 seconds into the video</p>
            </div>

            {tab === 'text' ? (
              <>
                <textarea
                  value={textFeedback} onChange={e => setTextFeedback(e.target.value)}
                  placeholder="Describe your feedback in detail — mention specific moments, what you liked, what needs changing..."
                  rows={6}
                  className="flex w-full rounded-xl border border-input bg-background px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground resize-none focus:border-primary outline-none min-h-[200px]"
                />
                <Button onClick={submitTextFeedback} disabled={!textFeedback.trim() || submitting}
                  className="w-full gap-2 h-[52px] text-base bg-gradient-to-r from-primary to-primary/80">
                  {submitting ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
                  Send Feedback
                </Button>
              </>
            ) : (
              <div className="space-y-5">
                {/* Waveform */}
                <div className="bg-muted/20 rounded-2xl p-6 flex items-center justify-center h-24 gap-0.5">
                  {voice.levels.map((level, i) => (
                    <div key={i}
                      className={cn('w-1 rounded-full transition-all duration-75', voice.state === 'recording' ? 'bg-primary' : 'bg-muted-foreground/30')}
                      style={{ height: `${Math.max(4, level * 64)}px` }} />
                  ))}
                </div>

                {/* Timer */}
                <div className="text-center">
                  <span className={cn('text-3xl font-mono font-bold', voice.state === 'recording' ? 'text-primary' : 'text-foreground')}>
                    {voice.formatTime(voice.elapsed)}
                  </span>
                  <span className="text-sm text-muted-foreground ml-2">/ 5:00</span>
                  <p className="text-xs text-muted-foreground mt-1">Maximum 5 minutes</p>
                </div>

                {/* Playback */}
                {voice.state === 'preview' && voice.audioUrl && (
                  <div className="p-4 bg-muted/20 rounded-xl space-y-2">
                    <div className="flex items-center gap-3">
                      <Mic size={16} className="text-primary" />
                      <span className="text-sm text-foreground font-medium">Voice message — {voice.formatTime(voice.elapsed)}</span>
                    </div>
                    <audio src={voice.audioUrl} controls className="w-full h-10" />
                  </div>
                )}

                {/* Controls */}
                <div className="flex gap-3 justify-center">
                  {voice.state === 'idle' && (
                    <button onClick={voice.startRecording}
                      className="h-20 w-20 rounded-full bg-primary hover:bg-primary/90 text-primary-foreground flex items-center justify-center shadow-lg transition-all hover:scale-105">
                      <Mic size={28} />
                    </button>
                  )}
                  {voice.state === 'recording' && (
                    <button onClick={voice.stopRecording}
                      className="h-20 w-20 rounded-full bg-destructive hover:bg-destructive/90 text-destructive-foreground flex items-center justify-center shadow-lg animate-pulse">
                      <Square size={28} />
                    </button>
                  )}
                  {voice.state === 'preview' && (
                    <>
                      <Button onClick={voice.reset} variant="outline" size="lg" className="gap-2">
                        <RotateCcw size={16} /> Re-record
                      </Button>
                      <Button onClick={submitVoiceFeedback} disabled={submitting} size="lg"
                        className="gap-2 bg-success hover:bg-success/90 text-success-foreground">
                        {submitting ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                        Send Voice Message
                      </Button>
                    </>
                  )}
                </div>
              </div>
            )}

            {/* Contact buttons */}
            <div className="flex gap-3 pt-2">
              <a href={`tel:${PHONE}`} className="flex-1 flex items-center justify-center gap-2 py-3 border border-glass-border rounded-xl text-sm text-muted-foreground hover:text-foreground hover:bg-muted/30 transition-colors">
                <Phone size={14} /> Call Us
              </a>
              <a href={`https://wa.me/${PHONE}`} target="_blank" rel="noopener noreferrer" className="flex-1 flex items-center justify-center gap-2 py-3 border border-glass-border rounded-xl text-sm text-success hover:bg-success/10 transition-colors">
                <MessageCircle size={14} /> WhatsApp
              </a>
            </div>

            {/* Feedback history */}
            <div className="space-y-3 pt-3">
              <h3 className="text-sm font-semibold text-foreground">Previous Feedback</h3>
              {feedback.length === 0 ? (
                <div className="p-6 rounded-xl bg-muted/10 text-center">
                  <p className="text-sm text-muted-foreground">No feedback submitted yet — use the form above to share your thoughts</p>
                </div>
              ) : feedback.map(f => (
                <div key={f.id} className={cn('p-4 rounded-xl min-h-[80px]',
                  f.is_resolved ? 'bg-success/5 border border-success/20' : 'bg-amber-500/5 border border-amber-500/20')}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 space-y-1.5">
                      {f.type === 'voice' && f.content ? (
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <Mic size={14} className="text-primary" />
                            <span className="text-sm font-medium text-foreground">Voice message</span>
                          </div>
                          <audio src={f.content} controls className="w-full h-10" />
                        </div>
                      ) : (
                        <p className="text-sm text-foreground/90 leading-relaxed">{f.content}</p>
                      )}
                      {f.timestamp_in_video && (
                        <p className="text-xs text-muted-foreground flex items-center gap-1"><Clock size={10} />{f.timestamp_in_video}</p>
                      )}
                      <p className="text-xs text-muted-foreground">
                        Sent {format(new Date(f.created_at), 'MMM d')} at {format(new Date(f.created_at), 'h:mm a')}
                      </p>
                    </div>
                    <div className="flex-shrink-0">
                      {f.is_resolved ? (
                        <span className="inline-flex items-center gap-1 text-xs text-success bg-success/10 px-2 py-1 rounded-full">
                          <Check size={10} /> Resolved
                        </span>
                      ) : (
                        <span className="text-xs text-amber-400 bg-amber-500/10 px-2 py-1 rounded-full">Pending</span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
