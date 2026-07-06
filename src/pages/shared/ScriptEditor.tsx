import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import Highlight from '@tiptap/extension-highlight';
import Image from '@tiptap/extension-image';
import Link from '@tiptap/extension-link';
import Placeholder from '@tiptap/extension-placeholder';
import CharacterCount from '@tiptap/extension-character-count';
import { Table } from '@tiptap/extension-table';
import { TableRow } from '@tiptap/extension-table-row';
import { TableCell } from '@tiptap/extension-table-cell';
import { TableHeader } from '@tiptap/extension-table-header';
import Collaboration from '@tiptap/extension-collaboration';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { EditorToolbar } from '@/components/scripts/EditorToolbar';
import { CommentsPanel } from '@/components/scripts/CommentsPanel';
import { CommentMark } from '@/lib/scripts/commentMark';
import { useYSupabaseProvider, encodeSnapshotBase64 } from '@/lib/scripts/useYSupabaseProvider';
import { exportEditorToPdf } from '@/lib/scripts/exportPdf';
import { exportEditorToDocx } from '@/lib/scripts/exportDocx';
import { ArrowLeft, Users, Circle, MessageSquare, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Props {
  routeBase: '/writer/scripts' | '/admin/scripts';
}

const COLORS = ['#f59e0b', '#10b981', '#3b82f6', '#a855f7', '#ec4899', '#ef4444', '#14b8a6', '#eab308'];
const colorForId = (id: string) => COLORS[Math.abs(hashCode(id)) % COLORS.length];
const hashCode = (s: string) => {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = ((h << 5) - h) + s.charCodeAt(i);
  return h;
};

export default function ScriptEditor({ routeBase }: Props) {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  const { toast } = useToast();

  const [scriptTitle, setScriptTitle] = useState('');
  const [loading, setLoading] = useState(true);
  const [canEdit, setCanEdit] = useState(false);
  const [saving, setSaving] = useState<'idle' | 'saving' | 'saved'>('idle');
  const [showComments, setShowComments] = useState(false);
  const [meta, setMeta] = useState<{ client_id: string | null; linked_writing_task_id: string | null }>({
    client_id: null,
    linked_writing_task_id: null,
  });
  const uploadInputRef = useRef<HTMLInputElement>(null);
  const editorContainerRef = useRef<HTMLDivElement>(null);
  const saveTimer = useRef<number | null>(null);
  const titleTimer = useRef<number | null>(null);

  const userName = (profile as { full_name?: string } | null)?.full_name || user?.email?.split('@')[0] || 'Guest';
  const userColor = useMemo(() => (user ? colorForId(user.id) : COLORS[0]), [user]);

  // Load base metadata + permissions
  useEffect(() => {
    if (!id) return;
    (async () => {
      setLoading(true);
      const { data, error } = await supabase.from('scripts').select('*').eq('id', id).single();
      if (error || !data) {
        toast({ title: 'Script not found', variant: 'destructive' });
        navigate(routeBase);
        return;
      }
      setScriptTitle(data.title);
      setMeta({ client_id: data.client_id, linked_writing_task_id: data.linked_writing_task_id });
      // Determine edit permission via RLS test update — try a no-op update
      const { error: upErr } = await supabase
        .from('scripts')
        .update({ updated_by: user?.id ?? data.updated_by })
        .eq('id', id);
      setCanEdit(!upErr);
      setLoading(false);
    })();
  }, [id, navigate, routeBase, toast, user?.id]);

  const provider = useYSupabaseProvider({
    scriptId: id!,
    userId: user?.id || 'anon',
    userName,
    userColor,
    canEdit,
  });

  const editor = useEditor({
    editable: canEdit && !loading,
    extensions: [
      StarterKit.configure({ undoRedo: false }),
      Underline,
      Highlight.configure({ multicolor: false }),
      Link.configure({ openOnClick: false, autolink: true }),
      Image,
      Table.configure({ resizable: true }),
      TableRow,
      TableHeader,
      TableCell,
      Placeholder.configure({ placeholder: 'Start writing your script…' }),
      CharacterCount,
      CommentMark,
      Collaboration.configure({ document: provider.ydoc }),
    ],
  }, [provider.ydoc, canEdit, loading]);

  // Debounced snapshot save
  useEffect(() => {
    if (!editor || !id || !canEdit) return;
    const handler = () => {
      if (saveTimer.current) window.clearTimeout(saveTimer.current);
      setSaving('saving');
      saveTimer.current = window.setTimeout(async () => {
        const json = editor.getJSON();
        const html = editor.getHTML();
        const words = editor.storage.characterCount?.words?.() ?? 0;
        const chars = editor.storage.characterCount?.characters?.() ?? 0;
        const snapshot = encodeSnapshotBase64(provider.ydoc);
        const { error } = await supabase
          .from('scripts')
          .update({
            content_json: json,
            content_html: html,
            word_count: words,
            char_count: chars,
            ydoc_state: snapshot,
            updated_by: user?.id,
          })
          .eq('id', id);
        if (!error) {
          setSaving('saved');
          window.setTimeout(() => setSaving('idle'), 1500);
        } else {
          setSaving('idle');
        }
      }, 1500);
    };
    editor.on('update', handler);
    return () => { editor.off('update', handler); };
  }, [editor, id, canEdit, provider.ydoc, user?.id]);

  const saveTitle = (newTitle: string) => {
    setScriptTitle(newTitle);
    if (!canEdit || !id) return;
    if (titleTimer.current) window.clearTimeout(titleTimer.current);
    titleTimer.current = window.setTimeout(async () => {
      await supabase.from('scripts').update({ title: newTitle || 'Untitled Script' }).eq('id', id);
    }, 600);
  };

  const handleUpload = async (file: File) => {
    if (!file || !user) return;
    if (file.size > 20 * 1024 * 1024) {
      toast({ title: 'Max 20MB', variant: 'destructive' });
      return;
    }
    const path = `${id}/${Date.now()}-${file.name.replace(/[^a-z0-9.]/gi, '_')}`;
    const { error } = await supabase.storage.from('script-assets').upload(path, file);
    if (error) { toast({ title: 'Upload failed', description: error.message, variant: 'destructive' }); return; }
    const { data } = await supabase.storage.from('script-assets').createSignedUrl(path, 60 * 60 * 24 * 365);
    if (data?.signedUrl && editor) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (editor.chain().focus() as any).setImage({ src: data.signedUrl }).run();
    }
  };

  const addComment = async () => {
    if (!editor || !user || !id) return;
    const { from, to } = editor.state.selection;
    if (from === to) return;
    const body = window.prompt('Add a comment:');
    if (!body || !body.trim()) return;
    const { data, error } = await supabase
      .from('script_comments')
      .insert({ script_id: id, author_id: user.id, body: body.trim(), anchor: { from, to } })
      .select('id')
      .single();
    if (error || !data) {
      toast({ title: 'Failed to save comment', variant: 'destructive' });
      return;
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (editor.chain().focus() as any).setComment(data.id).run();
    setShowComments(true);
  };

  const resolveComment = useCallback(async (commentId: string) => {
    if (!editor) return;
    await supabase.from('script_comments').update({ resolved: true }).eq('id', commentId);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (editor.chain().focus() as any).unsetComment(commentId).run();
  }, [editor]);

  const focusComment = useCallback((commentId: string) => {
    const el = editorContainerRef.current?.querySelector(`[data-comment-id="${commentId}"]`);
    if (el && 'scrollIntoView' in el) {
      (el as HTMLElement).scrollIntoView({ behavior: 'smooth', block: 'center' });
      (el as HTMLElement).classList.add('script-comment-flash');
      setTimeout(() => (el as HTMLElement).classList.remove('script-comment-flash'), 1400);
    }
  }, []);

  const doExportPdf = () => {
    const el = editorContainerRef.current?.querySelector('.ProseMirror');
    if (!el) return;
    exportEditorToPdf(el as HTMLElement, scriptTitle || 'script');
  };
  const doExportDocx = () => {
    if (!editor) return;
    exportEditorToDocx(editor.getJSON(), scriptTitle || 'script');
  };

  const words = editor?.storage.characterCount?.words?.() ?? 0;
  const chars = editor?.storage.characterCount?.characters?.() ?? 0;

  return (
    <div className="flex flex-col h-screen bg-background">
      <header className="border-b border-border bg-card/60 backdrop-blur px-4 py-2.5 flex items-center gap-3">
        <button
          onClick={() => navigate(routeBase)}
          className="h-8 w-8 flex items-center justify-center rounded-md hover:bg-muted/40 text-muted-foreground"
          title="Back to library"
        >
          <ArrowLeft size={16} />
        </button>
        <Input
          value={scriptTitle}
          onChange={(e) => saveTitle(e.target.value)}
          disabled={!canEdit}
          className="h-9 border-0 focus-visible:ring-0 font-display font-semibold text-lg bg-transparent px-1 flex-1 max-w-2xl"
          placeholder="Untitled Script"
        />
        <div className="flex items-center gap-3">
          <div className={cn(
            'flex items-center gap-1.5 text-xs',
            provider.status === 'connected' ? 'text-emerald-500' : 'text-amber-500'
          )}>
            <Circle size={8} className={cn(provider.status === 'connected' ? 'fill-emerald-500' : 'fill-amber-500')} />
            {provider.status === 'connected' ? 'Live' : provider.status === 'connecting' ? 'Connecting…' : 'Offline'}
          </div>
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <Users size={12} /> {provider.peers}
          </div>
          <div className="text-xs text-muted-foreground min-w-16 text-right">
            {saving === 'saving' && <span className="flex items-center gap-1"><Loader2 size={11} className="animate-spin" /> Saving…</span>}
            {saving === 'saved' && <span className="text-emerald-500">Saved</span>}
            {saving === 'idle' && canEdit && <span>Auto-save on</span>}
            {!canEdit && <span>Read only</span>}
          </div>
          <Button
            variant={showComments ? 'default' : 'outline'}
            size="sm"
            className="gap-1.5"
            onClick={() => setShowComments((v) => !v)}
          >
            <MessageSquare size={14} /> Comments
          </Button>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        <div className="flex-1 flex flex-col overflow-hidden">
          <EditorToolbar
            editor={editor}
            canEdit={canEdit}
            onUploadImage={() => uploadInputRef.current?.click()}
            onAddComment={addComment}
            onExportPdf={doExportPdf}
            onExportDocx={doExportDocx}
          />
          <input
            ref={uploadInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) handleUpload(f);
              e.target.value = '';
            }}
          />
          <div ref={editorContainerRef} className="flex-1 overflow-y-auto">
            <div className="max-w-4xl mx-auto py-10 px-6">
              <div className="script-page bg-card rounded-lg shadow-lg border border-border p-10 md:p-16 min-h-[70vh]">
                {loading ? (
                  <div className="flex items-center justify-center py-16">
                    <Loader2 className="animate-spin text-primary" />
                  </div>
                ) : (
                  <EditorContent editor={editor} className="script-prose" />
                )}
              </div>
              <div className="flex items-center justify-between text-xs text-muted-foreground py-4 px-2">
                <span>{words} words · {chars} characters</span>
                <span>Changes are saved automatically</span>
              </div>
            </div>
          </div>
        </div>
        {showComments && (
          <aside className="w-80 shrink-0 hidden md:block">
            <CommentsPanel
              scriptId={id!}
              onResolve={resolveComment}
              onFocus={focusComment}
              onClose={() => setShowComments(false)}
            />
          </aside>
        )}
      </div>
    </div>
  );
}
