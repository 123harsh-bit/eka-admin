import { useState, useEffect } from 'react';
import { SocialLayout } from '@/components/social/SocialLayout';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, ChevronRight, Instagram, Facebook, Youtube, Linkedin } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface Post {
  id: string;
  title: string;
  scheduled_at: string;
  platforms: string[];
  status: string;
}

const platformIcon: Record<string, typeof Instagram> = {
  instagram: Instagram, facebook: Facebook, youtube: Youtube, linkedin: Linkedin,
};

const STATUS_COLORS: Record<string, string> = {
  draft: 'bg-muted text-muted-foreground',
  scheduled: 'bg-blue-500/20 text-blue-400',
  ready: 'bg-amber-500/20 text-amber-400',
  published: 'bg-success/20 text-success',
  failed: 'bg-destructive/20 text-destructive',
};

export default function SocialCalendar() {
  const navigate = useNavigate();
  const [date, setDate] = useState(new Date());
  const [posts, setPosts] = useState<Post[]>([]);

  useEffect(() => {
    const start = new Date(date.getFullYear(), date.getMonth(), 1);
    const end = new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59);
    supabase.from('scheduled_posts')
      .select('id, title, scheduled_at, platforms, status')
      .gte('scheduled_at', start.toISOString())
      .lte('scheduled_at', end.toISOString())
      .then(({ data }) => setPosts((data as unknown as Post[]) || []));
  }, [date]);

  const monthName = date.toLocaleString('default', { month: 'long', year: 'numeric' });
  const firstDay = new Date(date.getFullYear(), date.getMonth(), 1).getDay();
  const daysInMonth = new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  const cells = Array.from({ length: firstDay }, () => null).concat(Array.from({ length: daysInMonth }, (_, i) => i + 1));

  const postsByDay: Record<number, Post[]> = {};
  posts.forEach(p => {
    if (!p.scheduled_at) return;
    const d = new Date(p.scheduled_at).getDate();
    postsByDay[d] = postsByDay[d] || [];
    postsByDay[d].push(p);
  });

  return (
    <SocialLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-display font-bold gradient-text">Calendar</h1>
            <p className="text-muted-foreground mt-1">Visualize your content pipeline</p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="icon" onClick={() => setDate(new Date(date.getFullYear(), date.getMonth() - 1, 1))}><ChevronLeft size={16} /></Button>
            <span className="font-semibold text-foreground min-w-40 text-center">{monthName}</span>
            <Button variant="outline" size="icon" onClick={() => setDate(new Date(date.getFullYear(), date.getMonth() + 1, 1))}><ChevronRight size={16} /></Button>
          </div>
        </div>

        <div className="glass-card p-4">
          <div className="grid grid-cols-7 gap-1 mb-2">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
              <div key={d} className="text-center text-xs font-semibold text-muted-foreground py-2">{d}</div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-1">
            {cells.map((day, i) => (
              <div key={i} className={cn('min-h-24 rounded-lg p-1.5 border', day ? 'bg-card/50 border-border' : 'border-transparent')}>
                {day && (
                  <>
                    <p className="text-xs font-semibold text-muted-foreground mb-1">{day}</p>
                    <div className="space-y-1">
                      {(postsByDay[day] || []).slice(0, 3).map(p => (
                        <button
                          key={p.id}
                          onClick={() => navigate(`/social/compose?id=${p.id}`)}
                          className={cn('w-full text-left text-[10px] px-1.5 py-1 rounded truncate', STATUS_COLORS[p.status])}
                        >
                          <div className="flex items-center gap-1">
                            {p.platforms.slice(0, 2).map(plat => {
                              const Icon = platformIcon[plat];
                              return Icon ? <Icon key={plat} size={9} /> : null;
                            })}
                            <span className="truncate">{p.title}</span>
                          </div>
                        </button>
                      ))}
                      {(postsByDay[day]?.length || 0) > 3 && (
                        <p className="text-[10px] text-muted-foreground px-1.5">+{postsByDay[day].length - 3} more</p>
                      )}
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </SocialLayout>
  );
}
