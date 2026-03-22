import { useState } from 'react';
import { CONTENT_TYPES, PLATFORM_OPTIONS, getAutoCreateTasks } from '@/lib/statusConfig';
import { Button } from '@/components/ui/button';
import { X, Loader2, Check } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Props {
  clientId: string;
  planId: string;
  defaultDate: string | null;
  onSave: (data: Record<string, unknown>) => Promise<void>;
  onClose: () => void;
}

export function ContentItemPanel({ clientId, planId, defaultDate, onSave, onClose }: Props) {
  const [title, setTitle] = useState('');
  const [contentType, setContentType] = useState('');
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>([]);
  const [plannedDate, setPlannedDate] = useState(defaultDate || '');
  const [captionBrief, setCaptionBrief] = useState('');
  const [visualBrief, setVisualBrief] = useState('');
  const [referenceUrl, setReferenceUrl] = useState('');
  const [hashtags, setHashtags] = useState('');
  const [saving, setSaving] = useState(false);

  const autoTasks = contentType ? getAutoCreateTasks(contentType) : null;

  const handleContentTypeSelect = (type: string) => {
    setContentType(type);
    const cfg = CONTENT_TYPES.find(t => t.value === type);
    if (cfg) {
      // Auto-add the default platform if not already selected
      if (!selectedPlatforms.includes(cfg.platform)) {
        setSelectedPlatforms([cfg.platform]);
      }
    }
  };

  const togglePlatform = (platform: string) => {
    setSelectedPlatforms(prev =>
      prev.includes(platform)
        ? prev.filter(p => p !== platform)
        : [...prev, platform]
    );
  };

  const handleSubmit = async () => {
    if (!title || !contentType || selectedPlatforms.length === 0) return;
    setSaving(true);
    // Store multiple platforms as comma-separated
    const platformValue = selectedPlatforms.length > 1 ? 'multiple' : selectedPlatforms[0];
    await onSave({
      title, content_type: contentType,
      platform: platformValue,
      platforms: selectedPlatforms, // pass raw array for display
      planned_date: plannedDate || null,
      caption_brief: captionBrief || null,
      visual_brief: visualBrief || null,
      reference_url: referenceUrl || null,
      hashtags: hashtags || null,
    });
    setSaving(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative w-full max-w-md bg-card border-l border-border h-full overflow-y-auto animate-in slide-in-from-right">
        <div className="sticky top-0 bg-card/95 backdrop-blur-sm p-4 border-b border-border flex items-center justify-between z-10">
          <h2 className="font-display font-semibold text-foreground">Add Content Item</h2>
          <button onClick={onClose}><X size={18} className="text-muted-foreground" /></button>
        </div>

        <div className="p-4 space-y-5">
          {/* Title */}
          <div className="space-y-2">
            <label className="text-xs font-medium text-muted-foreground">Content Title *</label>
            <input
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="e.g. 5 Tips for Better Sleep"
              className="w-full bg-input border border-border rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>

          {/* Content Type — visual grid */}
          <div className="space-y-2">
            <label className="text-xs font-medium text-muted-foreground">Content Type *</label>
            <div className="grid grid-cols-2 gap-2">
              {CONTENT_TYPES.map(type => (
                <button
                  key={type.value}
                  onClick={() => handleContentTypeSelect(type.value)}
                  className={cn(
                    'p-3 rounded-lg border text-left transition-all text-sm',
                    contentType === type.value
                      ? 'border-primary bg-primary/10 ring-1 ring-primary'
                      : 'border-border bg-card/60 hover:border-primary/30'
                  )}
                >
                  <span className="text-lg">{type.icon}</span>
                  <p className="font-medium text-foreground mt-1">{type.label}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Platform — multi-select visual grid */}
          <div className="space-y-2">
            <label className="text-xs font-medium text-muted-foreground">
              Platform(s) * <span className="text-[10px] text-muted-foreground/70">— select one or more</span>
            </label>
            <div className="grid grid-cols-3 gap-2">
              {PLATFORM_OPTIONS.filter(p => p.value !== 'multiple' && p.value !== 'other').map(p => {
                const isSelected = selectedPlatforms.includes(p.value);
                return (
                  <button
                    key={p.value}
                    onClick={() => togglePlatform(p.value)}
                    className={cn(
                      'p-2.5 rounded-lg border text-center transition-all text-sm relative',
                      isSelected
                        ? 'border-primary bg-primary/10 ring-1 ring-primary'
                        : 'border-border bg-card/60 hover:border-primary/30'
                    )}
                  >
                    {isSelected && (
                      <div className="absolute top-1 right-1 h-4 w-4 rounded-full bg-primary flex items-center justify-center">
                        <Check size={10} className="text-primary-foreground" />
                      </div>
                    )}
                    <span className="text-lg">{p.icon}</span>
                    <p className="text-xs font-medium text-foreground mt-1">{p.label}</p>
                  </button>
                );
              })}
            </div>
            {selectedPlatforms.length > 1 && (
              <p className="text-[10px] text-primary font-medium">
                📌 Will be posted on {selectedPlatforms.length} platforms: {selectedPlatforms.map(p => PLATFORM_OPTIONS.find(o => o.value === p)?.label).join(', ')}
              </p>
            )}
          </div>

          {/* Date */}
          <div className="space-y-2">
            <label className="text-xs font-medium text-muted-foreground">Planned Date</label>
            <input
              type="date"
              value={plannedDate}
              onChange={e => setPlannedDate(e.target.value)}
              className="w-full bg-input border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>

          {/* Briefs */}
          <div className="space-y-2">
            <label className="text-xs font-medium text-muted-foreground">Caption Brief</label>
            <textarea
              value={captionBrief}
              onChange={e => setCaptionBrief(e.target.value)}
              placeholder="What should the writer know?"
              rows={2}
              className="w-full bg-input border border-border rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring resize-none"
            />
          </div>

          <div className="space-y-2">
            <label className="text-xs font-medium text-muted-foreground">Visual Brief</label>
            <textarea
              value={visualBrief}
              onChange={e => setVisualBrief(e.target.value)}
              placeholder="What should the designer know?"
              rows={2}
              className="w-full bg-input border border-border rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring resize-none"
            />
          </div>

          <div className="space-y-2">
            <label className="text-xs font-medium text-muted-foreground">Reference URL</label>
            <input
              value={referenceUrl}
              onChange={e => setReferenceUrl(e.target.value)}
              placeholder="https://..."
              className="w-full bg-input border border-border rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>

          <div className="space-y-2">
            <label className="text-xs font-medium text-muted-foreground">Hashtags</label>
            <input
              value={hashtags}
              onChange={e => setHashtags(e.target.value)}
              placeholder="#health #wellness #doctor"
              className="w-full bg-input border border-border rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>

          {/* Auto-creation preview */}
          {autoTasks && contentType && (
            <div className="rounded-lg border border-primary/20 bg-primary/5 p-4 space-y-2">
              <p className="text-xs font-semibold text-foreground">This will automatically create:</p>
              <div className="space-y-1">
                {autoTasks.video && <p className="text-xs text-muted-foreground">🎬 1 Video in pipeline (idea stage)</p>}
                {autoTasks.writing && <p className="text-xs text-muted-foreground">✍️ 1 Writing task ({autoTasks.writingType?.replace('_', ' ')})</p>}
                {autoTasks.design && <p className="text-xs text-muted-foreground">🎨 1 Design task ({autoTasks.designType?.replace('_', ' ')})</p>}
              </div>
              <p className="text-[10px] text-muted-foreground">All linked to this content item.</p>
            </div>
          )}

          <Button
            onClick={handleSubmit}
            disabled={!title || !contentType || selectedPlatforms.length === 0 || saving}
            className="w-full gap-2"
          >
            {saving ? <Loader2 size={14} className="animate-spin" /> : null}
            Add to Plan & Create Tasks →
          </Button>
        </div>
      </div>
    </div>
  );
}
