import { AdminLayout } from '@/components/admin/AdminLayout';

export default function AdminTeam() {
  return (
    <AdminLayout>
      <div className="space-y-6">
        <h1 className="text-3xl font-display font-bold gradient-text">Team</h1>
        <div className="glass-card p-8 text-center">
          <p className="text-muted-foreground">Team management coming soon.</p>
        </div>
      </div>
    </AdminLayout>
  );
}
