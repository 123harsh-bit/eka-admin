import { AdminLayout } from '@/components/admin/AdminLayout';

export default function AdminSettings() {
  return (
    <AdminLayout>
      <div className="space-y-6">
        <h1 className="text-3xl font-display font-bold gradient-text">Settings</h1>
        <div className="glass-card p-8 text-center">
          <p className="text-muted-foreground">Settings coming soon.</p>
        </div>
      </div>
    </AdminLayout>
  );
}
