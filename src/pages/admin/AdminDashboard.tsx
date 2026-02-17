import { AdminLayout } from '@/components/admin/AdminLayout';
import { PageSkeleton } from '@/components/shared/SkeletonLoader';

export default function AdminDashboard() {
  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-display font-bold gradient-text">Agency Overview</h1>
          <p className="text-muted-foreground mt-1">Welcome back. Here&apos;s what&apos;s happening at Eka.</p>
        </div>

        {/* Stats cards placeholder */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          {['Active Clients', 'Videos in Production', 'Pending Reviews', 'Tasks Due This Week', 'Videos Live'].map(stat => (
            <div key={stat} className="glass-card p-5 space-y-2">
              <p className="text-xs text-muted-foreground uppercase tracking-wider">{stat}</p>
              <p className="text-2xl font-display font-bold text-foreground">0</p>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="glass-card p-6">
            <h2 className="text-lg font-display font-semibold text-foreground mb-4">Client Snapshots</h2>
            <p className="text-sm text-muted-foreground">No clients yet. Add your first client to get started.</p>
          </div>
          <div className="glass-card p-6">
            <h2 className="text-lg font-display font-semibold text-foreground mb-4">Team Activity</h2>
            <p className="text-sm text-muted-foreground">Activity will appear here once your team starts working.</p>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
