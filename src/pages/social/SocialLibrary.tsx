import { useEffect, useState } from 'react';
import { SocialLayout } from '@/components/social/SocialLayout';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Plus, Trash2, Copy, Sparkles, Loader2, Hash, FileText } from 'lucide-react';

interface Template {
  id: string; name: string; category: string; body: string; usage_count: number; created_by: string;
}
interface HashtagGroup {
  id: string; name: string; niche: string | null; hashtags: string; usage_count: number; created_by: string;
}

export default function SocialLibrary() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [templates, setTemplates] = useState<Template[]>([]);
  const [groups, setGroups] = useState<HashtagGroup[]>([]);
  const [aiTopic, setAiTopic] = useState('');
  const [aiBusy, setAiBusy] = useState(false);
  const [aiResult, setAiResult] = useState<{ caption?: string; hashtags?: string } | null>(null);

  // template form
  const [tName, setTName] = useState('');
  const [tCategory, setTCategory] = useState('general');
  const [tBody, setTBody] = useState('');
  // hashtag form
  const [hName, setHName] = useState('');
  const [hNiche, setHNiche] = useState('');
  const [hTags, setHTags] = useState('');

  const refresh = async () => {
    const [t, g] = await Promise.all([
      supabase.from('caption_templates').select('*').order('created_at', { ascending: false }),
      supabase.from('hashtag_groups').select('*').order('created_at', { ascending: false }),
    ]);
    setTemplates(t.data || []);
    setGroups(g.data || []);
  };
  useEffect(() => { refresh(); }, []);

  const addTemplate = async () => {
    if (!user || !tName.trim() || !tBody.trim()) return;
    const { error } = await supabase.from('caption_templates').insert({
      name: tName, category: tCategory, body: tBody, created_by: user.id, platforms: [],
    });
    if (error) return toast({ title: 'Failed', description: error.message, variant: 'destructive' });
    setTName(''); setTBody(''); toast({ title: 'Template added' }); refresh();
  };

  const addGroup = async () => {
    if (!user || !hName.trim() || !hTags.trim()) return;
    const { error } = await supabase.from('hashtag_groups').insert({
      name: hName, niche: hNiche || null, hashtags: hTags, created_by: user.id,
    });
    if (error) return toast({ title: 'Failed', description: error.message, variant: 'destructive' });
    setHName(''); setHNiche(''); setHTags(''); toast({ title: 'Hashtag group added' }); refresh();
  };

  const del = async (table: 'caption_templates' | 'hashtag_groups', id: string) => {
    const { error } = await supabase.from(table).delete().eq('id', id);
    if (error) return toast({ title: 'Failed', description: error.message, variant: 'destructive' });
    refresh();
  };

  const copy = async (text: string, label: string) => {
    await navigator.clipboard.writeText(text);
    toast({ title: `${label} copied` });
  };

  const aiGenerate = async (mode: 'caption' | 'hashtags') => {
    if (!aiTopic.trim()) return;
    setAiBusy(true);
    try {
      const { data, error } = await supabase.functions.invoke('social-ai-tools', {
        body: { mode, topic: aiTopic, platform: 'instagram', tone: 'engaging', count: 15 },
      });
      if (error) throw error;
      setAiResult(prev => ({ ...prev, ...data }));
    } catch (err) {
      toast({ title: 'AI failed', description: err instanceof Error ? err.message : '', variant: 'destructive' });
    } finally { setAiBusy(false); }
  };

  return (
    <SocialLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-display font-bold gradient-text">Caption & Hashtag Library</h1>
          <p className="text-muted-foreground mt-1">Reusable copy + AI assistant to speed up posting</p>
        </div>

        {/* AI assistant */}
        <div className="glass-card p-5 space-y-3">
          <div className="flex items-center gap-2">
            <Sparkles size={16} className="text-primary" />
            <h2 className="font-semibold">AI Assistant</h2>
          </div>
          <Textarea value={aiTopic} onChange={e => setAiTopic(e.target.value)} placeholder="Describe the post topic, e.g. 'Behind-the-scenes of our wedding shoot in Goa'…" className="min-h-20" />
          <div className="flex gap-2">
            <Button size="sm" onClick={() => aiGenerate('caption')} disabled={aiBusy} className="gap-2">
              {aiBusy ? <Loader2 size={12} className="animate-spin" /> : <FileText size={12} />} Generate caption
            </Button>
            <Button size="sm" variant="outline" onClick={() => aiGenerate('hashtags')} disabled={aiBusy} className="gap-2">
              <Hash size={12} /> Generate hashtags
            </Button>
          </div>
          {aiResult?.caption && (
            <div className="rounded-md border border-border p-3 space-y-2">
              <p className="text-sm whitespace-pre-wrap">{aiResult.caption}</p>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={() => copy(aiResult.caption!, 'Caption')} className="gap-1.5 h-7 text-xs"><Copy size={11} /> Copy</Button>
                <Button size="sm" variant="outline" onClick={() => { setTBody(aiResult.caption!); setTName(aiTopic.slice(0, 40)); }} className="gap-1.5 h-7 text-xs">Save as template</Button>
              </div>
            </div>
          )}
          {aiResult?.hashtags && (
            <div className="rounded-md border border-border p-3 space-y-2">
              <p className="text-sm text-primary">{aiResult.hashtags}</p>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={() => copy(aiResult.hashtags!, 'Hashtags')} className="gap-1.5 h-7 text-xs"><Copy size={11} /> Copy</Button>
                <Button size="sm" variant="outline" onClick={() => { setHTags(aiResult.hashtags!); setHName(aiTopic.slice(0, 40)); }} className="gap-1.5 h-7 text-xs">Save as group</Button>
              </div>
            </div>
          )}
        </div>

        <Tabs defaultValue="templates">
          <TabsList>
            <TabsTrigger value="templates"><FileText size={14} className="mr-1.5" /> Caption Templates ({templates.length})</TabsTrigger>
            <TabsTrigger value="hashtags"><Hash size={14} className="mr-1.5" /> Hashtag Groups ({groups.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="templates" className="space-y-4 mt-4">
            <div className="glass-card p-4 space-y-3">
              <h3 className="font-medium text-sm">Add caption template</h3>
              <div className="grid grid-cols-2 gap-2">
                <Input value={tName} onChange={e => setTName(e.target.value)} placeholder="Template name (e.g. 'Wedding teaser')" />
                <select value={tCategory} onChange={e => setTCategory(e.target.value)} className="h-10 rounded-md border border-input bg-background px-3 text-sm">
                  <option value="general">General</option>
                  <option value="reel">Reel</option>
                  <option value="carousel">Carousel</option>
                  <option value="story">Story</option>
                  <option value="promo">Promo</option>
                  <option value="testimonial">Testimonial</option>
                </select>
              </div>
              <Textarea value={tBody} onChange={e => setTBody(e.target.value)} placeholder="Caption body…" className="min-h-24" />
              <Button size="sm" onClick={addTemplate} className="gap-2"><Plus size={12} /> Add</Button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {templates.map(t => (
                <div key={t.id} className="glass-card p-4 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h4 className="font-medium text-sm">{t.name}</h4>
                      <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{t.category} • used {t.usage_count}x</p>
                    </div>
                    <div className="flex gap-1">
                      <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => copy(t.body, 'Caption')}><Copy size={12} /></Button>
                      {t.created_by === user?.id && <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => del('caption_templates', t.id)}><Trash2 size={12} /></Button>}
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground whitespace-pre-wrap line-clamp-4">{t.body}</p>
                </div>
              ))}
              {templates.length === 0 && <p className="text-sm text-muted-foreground col-span-2 text-center py-8">No templates yet</p>}
            </div>
          </TabsContent>

          <TabsContent value="hashtags" className="space-y-4 mt-4">
            <div className="glass-card p-4 space-y-3">
              <h3 className="font-medium text-sm">Add hashtag group</h3>
              <div className="grid grid-cols-2 gap-2">
                <Input value={hName} onChange={e => setHName(e.target.value)} placeholder="Group name" />
                <Input value={hNiche} onChange={e => setHNiche(e.target.value)} placeholder="Niche (optional)" />
              </div>
              <Textarea value={hTags} onChange={e => setHTags(e.target.value)} placeholder="#wedding #goa #cinematic …" className="min-h-20" />
              <Button size="sm" onClick={addGroup} className="gap-2"><Plus size={12} /> Add</Button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {groups.map(g => (
                <div key={g.id} className="glass-card p-4 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h4 className="font-medium text-sm">{g.name}</h4>
                      <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{g.niche || 'general'} • used {g.usage_count}x</p>
                    </div>
                    <div className="flex gap-1">
                      <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => copy(g.hashtags, 'Hashtags')}><Copy size={12} /></Button>
                      {g.created_by === user?.id && <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => del('hashtag_groups', g.id)}><Trash2 size={12} /></Button>}
                    </div>
                  </div>
                  <p className="text-xs text-primary line-clamp-3">{g.hashtags}</p>
                </div>
              ))}
              {groups.length === 0 && <p className="text-sm text-muted-foreground col-span-2 text-center py-8">No hashtag groups yet</p>}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </SocialLayout>
  );
}
