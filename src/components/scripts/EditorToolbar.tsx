import { Editor } from '@tiptap/react';
import { Button } from '@/components/ui/button';
import {
  Bold, Italic, Underline as UIcon, Strikethrough, Highlighter,
  List, ListOrdered, Quote, Link as LinkIcon, Image as ImageIcon,
  Table as TableIcon, Undo2, Redo2, Heading1, Heading2, Heading3,
  MessageSquarePlus, Download, FileText, FileType2,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface Props {
  editor: Editor | null;
  onUploadImage: () => void;
  onAddComment: () => void;
  onExportPdf: () => void;
  onExportDocx: () => void;
  canEdit: boolean;
}

const Btn = ({
  active, onClick, children, title, disabled,
}: {
  active?: boolean;
  onClick: () => void;
  children: React.ReactNode;
  title: string;
  disabled?: boolean;
}) => (
  <button
    type="button"
    onClick={onClick}
    title={title}
    disabled={disabled}
    className={cn(
      'h-8 w-8 flex items-center justify-center rounded-md transition-colors',
      active
        ? 'bg-primary/20 text-primary'
        : 'text-muted-foreground hover:text-foreground hover:bg-muted/40',
      disabled && 'opacity-40 cursor-not-allowed'
    )}
  >
    {children}
  </button>
);

export function EditorToolbar({
  editor, onUploadImage, onAddComment, onExportPdf, onExportDocx, canEdit,
}: Props) {
  if (!editor) return null;
  const disabled = !canEdit;

  const promptLink = () => {
    const prev = editor.getAttributes('link').href as string | undefined;
    const url = window.prompt('URL', prev || 'https://');
    if (url === null) return;
    if (url === '') {
      editor.chain().focus().unsetLink().run();
      return;
    }
    editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run();
  };

  return (
    <div className="sticky top-0 z-30 flex items-center gap-1 flex-wrap px-3 py-2 border-b border-border bg-card/95 backdrop-blur">
      <Btn title="Undo" disabled={disabled} onClick={() => editor.chain().focus().undo().run()}>
        <Undo2 size={15} />
      </Btn>
      <Btn title="Redo" disabled={disabled} onClick={() => editor.chain().focus().redo().run()}>
        <Redo2 size={15} />
      </Btn>
      <div className="w-px h-5 bg-border mx-1" />

      <Btn title="Heading 1" disabled={disabled}
        active={editor.isActive('heading', { level: 1 })}
        onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}>
        <Heading1 size={15} />
      </Btn>
      <Btn title="Heading 2" disabled={disabled}
        active={editor.isActive('heading', { level: 2 })}
        onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}>
        <Heading2 size={15} />
      </Btn>
      <Btn title="Heading 3" disabled={disabled}
        active={editor.isActive('heading', { level: 3 })}
        onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}>
        <Heading3 size={15} />
      </Btn>

      <div className="w-px h-5 bg-border mx-1" />
      <Btn title="Bold" disabled={disabled}
        active={editor.isActive('bold')}
        onClick={() => editor.chain().focus().toggleBold().run()}>
        <Bold size={15} />
      </Btn>
      <Btn title="Italic" disabled={disabled}
        active={editor.isActive('italic')}
        onClick={() => editor.chain().focus().toggleItalic().run()}>
        <Italic size={15} />
      </Btn>
      <Btn title="Underline" disabled={disabled}
        active={editor.isActive('underline')}
        onClick={() => editor.chain().focus().toggleUnderline().run()}>
        <UIcon size={15} />
      </Btn>
      <Btn title="Strikethrough" disabled={disabled}
        active={editor.isActive('strike')}
        onClick={() => editor.chain().focus().toggleStrike().run()}>
        <Strikethrough size={15} />
      </Btn>
      <Btn title="Highlight" disabled={disabled}
        active={editor.isActive('highlight')}
        onClick={() => editor.chain().focus().toggleHighlight().run()}>
        <Highlighter size={15} />
      </Btn>

      <div className="w-px h-5 bg-border mx-1" />
      <Btn title="Bullet list" disabled={disabled}
        active={editor.isActive('bulletList')}
        onClick={() => editor.chain().focus().toggleBulletList().run()}>
        <List size={15} />
      </Btn>
      <Btn title="Numbered list" disabled={disabled}
        active={editor.isActive('orderedList')}
        onClick={() => editor.chain().focus().toggleOrderedList().run()}>
        <ListOrdered size={15} />
      </Btn>
      <Btn title="Quote" disabled={disabled}
        active={editor.isActive('blockquote')}
        onClick={() => editor.chain().focus().toggleBlockquote().run()}>
        <Quote size={15} />
      </Btn>

      <div className="w-px h-5 bg-border mx-1" />
      <Btn title="Link" disabled={disabled} onClick={promptLink} active={editor.isActive('link')}>
        <LinkIcon size={15} />
      </Btn>
      <Btn title="Upload image" disabled={disabled} onClick={onUploadImage}>
        <ImageIcon size={15} />
      </Btn>
      <Btn title="Insert table" disabled={disabled}
        onClick={() =>
          editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()
        }>
        <TableIcon size={15} />
      </Btn>

      <div className="w-px h-5 bg-border mx-1" />
      <Btn title="Comment on selection" onClick={onAddComment}
        disabled={editor.state.selection.empty}>
        <MessageSquarePlus size={15} />
      </Btn>

      <div className="ml-auto flex items-center gap-1">
        <Button size="sm" variant="ghost" onClick={onExportPdf} className="gap-1 h-8">
          <FileText size={14} /> PDF
        </Button>
        <Button size="sm" variant="ghost" onClick={onExportDocx} className="gap-1 h-8">
          <FileType2 size={14} /> DOCX
        </Button>
      </div>
    </div>
  );
}
