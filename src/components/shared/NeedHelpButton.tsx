import { useState } from 'react';
import { HelpCircle, X, Phone, MessageCircle } from 'lucide-react';

const PHONE = '6304980350';

export function NeedHelpButton() {
  const [open, setOpen] = useState(false);

  return (
    <>
      {open && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setOpen(false)}
        />
      )}
      <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-3">
        {open && (
          <div className="glass-card border border-glass-border shadow-2xl p-4 w-64 space-y-3 fade-in">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-foreground">Need Help?</h3>
              <button onClick={() => setOpen(false)} className="text-muted-foreground hover:text-foreground"><X size={16} /></button>
            </div>
            <p className="text-xs text-muted-foreground">Reach out to your Eka contact directly:</p>
            <div className="space-y-2">
              <a
                href={`tel:${PHONE}`}
                className="flex items-center gap-2.5 w-full px-3 py-2.5 bg-primary/10 hover:bg-primary/20 rounded-lg text-sm text-primary font-medium transition-colors"
              >
                <Phone size={16} />
                Call Us
              </a>
              <a
                href={`https://wa.me/${PHONE}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2.5 w-full px-3 py-2.5 bg-success/10 hover:bg-success/20 rounded-lg text-sm text-success font-medium transition-colors"
              >
                <MessageCircle size={16} />
                WhatsApp
              </a>
            </div>
          </div>
        )}
        <button
          onClick={() => setOpen(!open)}
          className="flex items-center gap-2 px-4 py-2.5 bg-primary text-primary-foreground rounded-full shadow-lg hover:bg-primary/90 transition-all text-sm font-medium"
        >
          <HelpCircle size={16} />
          Need Help?
        </button>
      </div>
    </>
  );
}
