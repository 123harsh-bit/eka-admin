import { AdminLayout } from '@/components/admin/AdminLayout';

export default function AdminClients() {
  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-display font-bold gradient-text">Clients</h1>
            <p className="text-muted-foreground mt-1">Manage all your agency clients.</p>
          </div>
        </div>
        <div className="glass-card p-8 text-center">
          <p className="text-muted-foreground">Client management coming soon.</p>
        </div>
      </div>
    </AdminLayout>
  );
}
