import { useState } from 'react';
import { Sparkles, Loader2, Copy, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface Props {
  topic?: string;
  clientName?: string;
  contentType?: string;
  durationSeconds?: number;
  triggerLabel?: string;
  onApply?: (brief: BriefResult) => void;
}

export interface BriefResult {
  writing_brief: string;
  shoot_checklist: string[];
  caption_drafts: string[];
}

export function AIBriefGenerator({ topic: initialTopic = '', clientName, contentType, durationSeconds, triggerLabel = 'Generate brief', onApply }: Props) {
  const [open, setOpen] = useState(false);
  const [topic, setTopic] = useState(initialTopic);
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [brief, setBrief] = useState<BriefResult | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

  const generate = async () => {
    if (!topic.trim()) return toast.error('Topic required');
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-brief', {
        body: { topic, clientName, contentType, durationSeconds, notes },
      });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);
      setBrief(data as BriefResult);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to generate');
    } finally {
      setLoading(false);
    }
  };

  const copy = (key: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(key);
    setTimeout(() => setCopied(null), 1500);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Sparkles className="w-4 h-4" /> {triggerLabel}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader><DialogTitle className="flex items-center gap-2"><Sparkles className="w-5 h-5 text-primary" /> AI Brief Generator</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <Input placeholder="Topic / core idea" value={topic} onChange={e => setTopic(e.target.value)} />
          <Textarea placeholder="Extra notes (optional)" value={notes} onChange={e => setNotes(e.target.value)} rows={2} />
          <Button onClick={generate} disabled={loading} className="w-full gap-2">
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
            {loading ? 'Generating…' : (brief ? 'Regenerate' : 'Generate')}
          </Button>

          {brief && (
            <div className="space-y-4 pt-2">
              <Card className="p-3">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-semibold text-sm">Writing brief</h3>
                  <Button size="sm" variant="ghost" onClick={() => copy('brief', brief.writing_brief)}>
                    {copied === 'brief' ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  </Button>
                </div>
                <p className="text-sm whitespace-pre-wrap">{brief.writing_brief}</p>
              </Card>

              <Card className="p-3">
                <h3 className="font-semibold text-sm mb-2">Shoot checklist</h3>
                <ul className="text-sm space-y-1">
                  {brief.shoot_checklist.map((s, i) => <li key={i} className="flex gap-2"><span className="text-muted-foreground">{i + 1}.</span>{s}</li>)}
                </ul>
              </Card>

              <Card className="p-3">
                <h3 className="font-semibold text-sm mb-2">Caption drafts</h3>
                <div className="space-y-2">
                  {brief.caption_drafts.map((c, i) => (
                    <div key={i} className="flex items-start gap-2 p-2 rounded bg-muted/50">
                      <p className="text-sm flex-1 whitespace-pre-wrap">{c}</p>
                      <Button size="sm" variant="ghost" onClick={() => copy(`cap-${i}`, c)}>
                        {copied === `cap-${i}` ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                      </Button>
                    </div>
                  ))}
                </div>
              </Card>

              {onApply && (
                <Button onClick={() => { onApply(brief); setOpen(false); }} className="w-full">Apply brief</Button>
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
