import { AdminLayout } from '@/components/admin/AdminLayout';

export default function AdminWritingTasks() {
  return (
    <AdminLayout>
      <div className="space-y-6">
        <h1 className="text-3xl font-display font-bold gradient-text">Writing Tasks</h1>
        <div className="glass-card p-8 text-center">
          <p className="text-muted-foreground">Writing task management coming soon.</p>
        </div>
      </div>
    </AdminLayout>
  );
}
