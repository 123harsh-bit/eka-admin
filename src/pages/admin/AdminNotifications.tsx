import { AdminLayout } from '@/components/admin/AdminLayout';

export default function AdminNotifications() {
  return (
    <AdminLayout>
      <div className="space-y-6">
        <h1 className="text-3xl font-display font-bold gradient-text">Notifications</h1>
        <div className="glass-card p-8 text-center">
          <p className="text-muted-foreground">Notifications coming soon.</p>
        </div>
      </div>
    </AdminLayout>
  );
}
