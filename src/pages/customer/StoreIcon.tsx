import { LucideIcon, type IconName } from '../../components/shared/LucideIcon';

const storeIconMapping: Record<string, IconName> = {
  search: 'search',
  grid: 'grid',
  leaf: 'leaf',
  fruit: 'apple',
  basket: 'shoppingBasket',
  chevronLeft: 'chevronLeft',
  chevronRight: 'chevronRight',
  pause: 'pause',
  play: 'play',
  building: 'building',
};

export function StoreIcon({ name, size = 20, className = '' }: { name: keyof typeof storeIconMapping; size?: number | string; className?: string }) {
  const iconName = storeIconMapping[name] || 'search';
  return <LucideIcon name={iconName} size={size} className={`store-icon ${className}`.trim()} />;
}

