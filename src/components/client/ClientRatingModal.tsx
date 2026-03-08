import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Star } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

interface Props {
  videoId: string;
  videoTitle: string;
  clientId: string;
  onClose: () => void;
  onSubmitted: () => void;
}

export function ClientRatingModal({ videoId, videoTitle, clientId, onClose, onSubmitted }: Props) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [rating, setRating] = useState(0);
  const [hovered, setHovered] = useState(0);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!user || rating === 0) return;
    setSubmitting(true);
    const { error } = await supabase.from('client_ratings').insert({
      video_id: videoId,
      client_id: clientId,
      submitted_by: user.id,
      rating,
      comment: comment.trim() || null,
    });
    setSubmitting(false);
    if (error) {
      toast({ title: 'Error', description: 'Could not submit rating. Please try again.', variant: 'destructive' });
    } else {
      toast({ title: 'Thank you! ⭐', description: 'Your rating has been submitted.' });
      onSubmitted();
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-card border border-border rounded-2xl p-6 w-full max-w-md space-y-4" onClick={e => e.stopPropagation()}>
        <h3 className="text-lg font-display font-bold text-foreground">Rate this video</h3>
        <p className="text-sm text-muted-foreground">How was your experience with "{videoTitle}"?</p>

        <div className="flex justify-center gap-2 py-2">
          {[1, 2, 3, 4, 5].map(star => (
            <button
              key={star}
              onMouseEnter={() => setHovered(star)}
              onMouseLeave={() => setHovered(0)}
              onClick={() => setRating(star)}
              className="transition-transform hover:scale-110"
            >
              <Star
                size={36}
                className={cn(
                  'transition-colors',
                  (hovered || rating) >= star ? 'fill-yellow-400 text-yellow-400' : 'text-muted-foreground/30'
                )}
              />
            </button>
          ))}
        </div>
        <p className="text-center text-sm text-muted-foreground">
          {rating === 0 ? 'Tap a star' : ['', 'Poor', 'Fair', 'Good', 'Great', 'Excellent'][rating]}
        </p>

        <Textarea
          value={comment}
          onChange={e => setComment(e.target.value)}
          placeholder="Any additional comments? (optional)"
          rows={3}
        />

        <div className="flex gap-3">
          <Button variant="outline" className="flex-1" onClick={onClose}>Cancel</Button>
          <Button className="flex-1" onClick={handleSubmit} disabled={rating === 0 || submitting}>
            {submitting ? 'Submitting...' : 'Submit Rating'}
          </Button>
        </div>
      </div>
    </div>
  );
}
