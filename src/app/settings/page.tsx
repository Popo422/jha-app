"use client";

import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useAppSelector, useAppDispatch } from '@/lib/hooks';
import { toggleTheme } from '@/lib/features/theme/themeSlice';
import { updateContractorLanguage } from '@/lib/features/auth/authSlice';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Toast, useToast } from '@/components/ui/toast';
import { Moon, Sun, Palette, Languages, ArrowLeft } from 'lucide-react';
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import Header from '@/components/Header';
import AppSidebar from '@/components/AppSidebar';
import Link from 'next/link';

export default function ContractorSettingsPage() {
  const { t, i18n } = useTranslation('common');
  const dispatch = useAppDispatch();
  const theme = useAppSelector((state) => state.theme.mode);
  const contractor = useAppSelector((state) => state.auth.contractor);
  const [isUpdatingLanguage, setIsUpdatingLanguage] = useState(false);
  
  const { toast, showToast, hideToast } = useToast();

  const handleThemeToggle = () => {
    dispatch(toggleTheme());
    showToast(t('settings.saved'), 'success');
  };

  const handleLanguageChange = async (language: string) => {
    setIsUpdatingLanguage(true);
    
    try {
      // Update language in the UI immediately
      await i18n.changeLanguage(language);
      
      // Update language preference in the database
      const response = await fetch('/api/contractor/preferences', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ language }),
      });

      if (response.ok) {
        // Update Redux state with new language
        dispatch(updateContractorLanguage(language));
        showToast(t('settings.saved'), 'success');
      } else {
        const errorData = await response.json();
        console.error('Failed to update language preference:', errorData);
        showToast(t('settings.saveError') || 'Failed to save language preference', 'error');
      }
    } catch (error) {
      console.error('Error updating language preference:', error);
      showToast(t('settings.saveError') || 'Failed to save language preference', 'error');
    } finally {
      setIsUpdatingLanguage(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Header />
      <AppSidebar />
      
      <main className="p-4">
        <div className="max-w-4xl mx-auto">
          <div className="mb-6">
            <Button variant="ghost" asChild className="mb-4">
              <Link href="/">
                <ArrowLeft className="h-4 w-4 mr-2" />
                {t('common.back')}
              </Link>
            </Button>
            <h1 className="text-3xl font-bold text-foreground">{t('settings.title')}</h1>
            <p className="text-muted-foreground mt-2">
              {t('settings.managePreferences')}
            </p>
          </div>

          <div className="space-y-6">
            {/* User Information */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Languages className="h-5 w-5 mr-2" />
                  {t('settings.userInformation')}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm font-medium">{t('contractors.firstName')}</Label>
                    <p className="text-sm text-muted-foreground">{contractor?.name || 'N/A'}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium">{t('contractors.companyName')}</Label>
                    <p className="text-sm text-muted-foreground">{contractor?.companyName || 'N/A'}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Appearance Settings */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Palette className="h-5 w-5 mr-2" />
                  {t('settings.appearance')}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <Label className="text-sm font-medium">{t('settings.themeMode')}</Label>
                    <p className="text-sm text-muted-foreground">
                      {t('settings.themeDescription')}
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleThemeToggle}
                    className="w-32"
                  >
                    {theme === 'light' ? (
                      <>
                        <Moon className="h-4 w-4 mr-2" />
                        {t('settings.darkMode')}
                      </>
                    ) : (
                      <>
                        <Sun className="h-4 w-4 mr-2" />
                        {t('settings.lightMode')}
                      </>
                    )}
                  </Button>
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <Label className="text-sm font-medium">{t('settings.language')}</Label>
                    <p className="text-sm text-muted-foreground">
                      {t('settings.selectLanguage')}
                    </p>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" size="sm" className="w-32" disabled={isUpdatingLanguage}>
                        <Languages className="h-4 w-4 mr-2" />
                        {isUpdatingLanguage ? t('common.updating') || 'Updating...' : 
                         (i18n.language === 'es' ? t('settings.spanish') : 
                          i18n.language === 'pl' ? t('settings.polish') :
                          i18n.language === 'zh' ? t('settings.chinese') :
                          t('settings.english'))}
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent>
                      <DropdownMenuItem 
                        onClick={() => handleLanguageChange('en')}
                        disabled={isUpdatingLanguage}
                      >
                        {t('settings.english')}
                      </DropdownMenuItem>
                      <DropdownMenuItem 
                        onClick={() => handleLanguageChange('es')}
                        disabled={isUpdatingLanguage}
                      >
                        {t('settings.spanish')}
                      </DropdownMenuItem>
                      <DropdownMenuItem 
                        onClick={() => handleLanguageChange('pl')}
                        disabled={isUpdatingLanguage}
                      >
                        {t('settings.polish')}
                      </DropdownMenuItem>
                      <DropdownMenuItem 
                        onClick={() => handleLanguageChange('zh')}
                        disabled={isUpdatingLanguage}
                      >
                        {t('settings.chinese')}
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </CardContent>
            </Card>

            {/* Application Information */}
            <Card>
              <CardHeader>
                <CardTitle>{t('settings.applicationInfo')}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm font-medium">{t('settings.version')}</span>
                    <span className="text-sm text-muted-foreground">{t('nav.version')}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm font-medium">{t('settings.currentLanguage')}</span>
                    <span className="text-sm text-muted-foreground">
                      {i18n.language === 'es' ? t('settings.spanish') : 
                       i18n.language === 'pl' ? t('settings.polish') :
                       i18n.language === 'zh' ? t('settings.chinese') :
                       t('settings.english')}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm font-medium">{t('settings.currentTheme')}</span>
                    <span className="text-sm text-muted-foreground">
                      {theme === 'light' ? t('settings.lightMode') : t('settings.darkMode')}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>

      {/* Toast Component */}
      <Toast
        message={toast.message}
        type={toast.type}
        show={toast.show}
        onClose={hideToast}
      />
    </div>
  );
}