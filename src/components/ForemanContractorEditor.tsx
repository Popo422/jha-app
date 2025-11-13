"use client";

import { Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/hooks/useAuth';

interface ForemanContractorEditorProps {
  onLinkClick?: () => void;
}

export default function ForemanContractorEditor({ onLinkClick }: ForemanContractorEditorProps) {
  const { t } = useTranslation('common');
  const { isForeman } = useAuth();

  if (!isForeman) {
    return null;
  }

  return (
    <Button
      variant="ghost"
      className="w-full justify-start text-white hover:text-white dark:text-foreground hover:bg-white/10 dark:hover:bg-muted text-wrap"
      asChild
    >
      <Link href="/contractor-editor" onClick={onLinkClick}>
        <Users className="h-4 w-4 mr-3" />
        Contractor Management
      </Link>
    </Button>
  );
}