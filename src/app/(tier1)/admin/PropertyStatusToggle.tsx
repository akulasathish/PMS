'use client';

import { useState } from 'react';
import { togglePropertyStatus } from '@/app/actions/property';
import { Loader2, ToggleLeft, ToggleRight } from 'lucide-react';

interface Props {
  propertyId: string;
  initialStatus: string;
}

export default function PropertyStatusToggle({ propertyId, initialStatus }: Props) {
  const [isPending, setIsPending] = useState(false);
  // Default to Active if null/undefined since the DB might have older rows
  const [status, setStatus] = useState(initialStatus || 'Active');

  const handleToggle = async () => {
    setIsPending(true);
    const result = await togglePropertyStatus(propertyId, status);
    if (result.success && result.newStatus) {
      setStatus(result.newStatus);
    } else {
      console.error(result.error);
      alert(result.error || 'Failed to toggle status.');
    }
    setIsPending(false);
  };

  const isActive = status === 'Active';

  return (
    <button
      onClick={handleToggle}
      disabled={isPending}
      className={`flex items-center gap-2 px-2 py-1 rounded-full text-xs font-bold transition-all ${
        isActive 
          ? 'text-emerald-500 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30' 
          : 'text-rose-500 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30'
      }`}
      title={isActive ? 'Click to Suspend' : 'Click to Activate'}
    >
      {isPending ? (
        <Loader2 size={14} className="animate-spin" />
      ) : isActive ? (
        <ToggleRight size={14} />
      ) : (
        <ToggleLeft size={14} />
      )}
      {status}
    </button>
  );
}
