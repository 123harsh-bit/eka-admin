import { useEffect, useState } from 'react';
import { MessageCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuLabel, DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface Props {
  stage: string;
  phone?: string | null;
  clientName?: string | null;
  videoTitle?: string | null;
  shootDate?: string | null;
  link?: string | null;
  clientId?: string | null;
}

interface Template {
  id: string;
  name: string;
  template_text: string;
  client_id: string | null;
}

function fill(text: string, vars: Record<string, string>) {
  return text.replace(/\{(\w+)\}/g, (_, k) => vars[k] ?? `{${k}}`);
}

function normalizePhone(phone: string) {
  return phone.replace(/[^\d+]/g, '').replace(/^\+/, '');
}

export function WhatsAppButton({ stage, phone, clientName, videoTitle, shootDate, link, clientId }: Props) {
  const [templates, setTemplates] = useState<Template[]>([]);

  useEffect(() => {
    let mounted = true;
    supabase.from('whatsapp_templates')
      .select('id,name,template_text,client_id')
      .eq('stage', stage)
      .eq('is_active', true)
      .then(({ data }) => {
        if (!mounted) return;
        const list = (data || []) as Template[];
        // prefer client-specific templates, fall back to global
        const scoped = clientId ? list.filter(t => !t.client_id || t.client_id === clientId) : list.filter(t => !t.client_id);
        setTemplates(scoped);
      });
    return () => { mounted = false; };
  }, [stage, clientId]);

  const send = (tpl: Template) => {
    if (!phone) {
      toast.error('No phone number on file for this client');
      return;
    }
    const msg = fill(tpl.template_text, {
      client: clientName || '',
      title: videoTitle || '',
      shoot_date: shootDate || '',
      link: link || '',
    });
    const url = `https://wa.me/${normalizePhone(phone)}?text=${encodeURIComponent(msg)}`;
    window.open(url, '_blank');
  };

  if (templates.length === 0) return null;

  if (templates.length === 1) {
    return (
      <Button size="sm" variant="outline" onClick={() => send(templates[0])} className="gap-2">
        <MessageCircle className="w-4 h-4" /> WhatsApp
      </Button>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button size="sm" variant="outline" className="gap-2">
          <MessageCircle className="w-4 h-4" /> WhatsApp
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64">
        <DropdownMenuLabel>Send via WhatsApp</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {templates.map(t => (
          <DropdownMenuItem key={t.id} onClick={() => send(t)}>{t.name}</DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
