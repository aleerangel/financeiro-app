'use client';

import React, { createContext, useContext, useState, useCallback } from 'react';
import { BusinessProfile } from '@/types/database';
import { getBusinessProfile } from '@/lib/actions/business-profile';

interface BusinessProfileContextType {
  profile: BusinessProfile;
  businessName: string;
  salesLabel: string;
  segment: string;
  hasBusiness: boolean;
  refreshProfile: () => Promise<void>;
  setProfile: (profile: BusinessProfile) => void;
}

const BusinessProfileContext = createContext<BusinessProfileContextType | undefined>(undefined);

export function BusinessProfileProvider({
  initialProfile,
  children,
}: {
  initialProfile: BusinessProfile;
  children: React.ReactNode;
}) {
  const [profile, setProfile] = useState<BusinessProfile>(initialProfile);

  const refreshProfile = useCallback(async () => {
    try {
      const updated = await getBusinessProfile();
      setProfile(updated);
    } catch (err) {
      console.error('Erro ao recarregar perfil do negócio:', err);
    }
  }, []);

  const businessName = profile.business_name || 'Meu Negócio';
  const salesLabel = profile.sales_label || 'Atendimentos';
  const segment = profile.segment || 'barbearia';
  const hasBusiness = profile.has_business;

  return (
    <BusinessProfileContext.Provider
      value={{
        profile,
        businessName,
        salesLabel,
        segment,
        hasBusiness,
        refreshProfile,
        setProfile,
      }}
    >
      {children}
    </BusinessProfileContext.Provider>
  );
}

export function useBusinessProfile() {
  const ctx = useContext(BusinessProfileContext);
  if (!ctx) {
    throw new Error('useBusinessProfile deve ser utilizado dentro de um BusinessProfileProvider');
  }
  return ctx;
}

