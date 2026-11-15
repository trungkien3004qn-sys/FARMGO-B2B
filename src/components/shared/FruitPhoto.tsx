import { useState } from 'react';
import { FruitImage } from './FruitImage';

const samplePhotos = new Set([
  'avocado-034', 'avocado-sap', 'mango-cat-hoa-loc', 'dragon-fruit', 'orange', 'carrot',
  'tomato', 'cabbage', 'banana-tieu', 'lettuce', 'pineapple', 'watermelon', 'pomelo',
  'guava', 'papaya', 'passion-fruit', 'strawberry', 'mandarin', 'cucumber', 'broccoli',
  'potato', 'sweet-potato', 'pumpkin', 'bok-choy', 'spinach', 'lime',
]);
const listingPhotos: Partial<Record<string, string>> = { 'mango-mekong': 'mango-cat-hoa-loc' };

export function FruitPhoto({ id, name, imageUrl }: { id: string; name: string; imageUrl?: string }) {
  const key = listingPhotos[id] ?? id.replace(/-(demo|dalat|mekong)$/, '');
  const sample = samplePhotos.has(key) ? `${import.meta.env.BASE_URL}product-photos/${key}.webp` : undefined;
  const [failedSources, setFailedSources] = useState<string[]>([]);
  const source = [imageUrl, sample].find(url => url && !failedSources.includes(url));

  return (
    <figure className="supplier-fruit-photo">
      <div className="supplier-photo-frame">
        {source ? (
          <img src={source} alt={source === imageUrl ? `Ảnh lô hàng ${name}` : `Ảnh tham khảo ${name}`} width={480} height={280}
            loading="lazy" decoding="async" referrerPolicy="no-referrer"
            onError={() => setFailedSources(current => [...current, source])} />
        ) : (
          <div className="supplier-photo-fallback" role="img" aria-label={`Minh họa ${name}`}>
            <span aria-hidden="true"><FruitImage id={id} name={name} size={104} /></span>
          </div>
        )}
      </div>
    </figure>
  );
}
