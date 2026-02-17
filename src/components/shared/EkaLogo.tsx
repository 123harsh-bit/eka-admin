import { cn } from '@/lib/utils';

interface EkaLogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

const sizes = {
  sm: 'text-xl',
  md: 'text-2xl',
  lg: 'text-4xl',
  xl: 'text-5xl',
};

export function EkaLogo({ size = 'md', className }: EkaLogoProps) {
  return (
    <h1 className={cn('font-display font-extrabold gradient-text tracking-tight', sizes[size], className)}>
      Eka
    </h1>
  );
}
