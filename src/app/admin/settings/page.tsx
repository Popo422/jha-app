"use client";

import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useAppSelector, useAppDispatch } from '@/lib/hooks';
import { toggleTheme } from '@/lib/features/theme/themeSlice';
import { updateAdmin } from '@/lib/features/auth/authSlice';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Toast, useToast } from '@/components/ui/toast';
import { Moon, Sun, Palette, Upload, Image as ImageIcon, X, Save, RotateCcw, Languages } from 'lucide-react';
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

export default function SettingsPage() {
  const { t, i18n } = useTranslation('common');
  const dispatch = useAppDispatch();
  const theme = useAppSelector((state) => state.theme.mode);
  const admin = useAppSelector((state) => state.auth.admin);
  
  const [isSavingLogo, setIsSavingLogo] = useState(false);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [hasChanges, setHasChanges] = useState(false);
  const { toast, showToast, hideToast } = useToast();

  const handleThemeToggle = () => {
    dispatch(toggleTheme());
  };

  const handleLanguageChange = (language: string) => {
    i18n.changeLanguage(language);
    showToast(t('settings.saved'), 'success');
  };

  // Cleanup preview URL on unmount
  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  const handleLogoChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        showToast(t('settings.pleaseSelectImage'), 'error');
        return;
      }
      
      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        showToast(t('settings.imageSizeLimit'), 'error');
        return;
      }
      
      setLogoFile(file);
      
      // Create preview URL
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
      setHasChanges(true);
    }
  };

  const handleRemoveLogo = () => {
    setLogoFile(null);
    setPreviewUrl(null);
    setHasChanges(true);
  };

  const handleCancelChanges = () => {
    setLogoFile(null);
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }
    setPreviewUrl(null);
    setHasChanges(false);
  };

  const handleSaveLogo = async () => {
    if (!admin?.companyId || !hasChanges) return;

    setIsSavingLogo(true);
    try {
      const formData = new FormData();
      formData.append('companyId', admin.companyId);
      formData.append('currentLogoUrl', admin.companyLogoUrl || '');
      
      if (logoFile) {
        formData.append('logo', logoFile);
      } else {
        // If no logo file, we're removing the logo
        formData.append('removeLogo', 'true');
      }

      const response = await fetch('/api/admin/company/logo', {
        method: 'PUT',
        body: formData,
      });

      if (response.ok) {
        const result = await response.json();
        
        // Update the admin state with new logo URL
        if (admin) {
          dispatch(updateAdmin({
            ...admin,
            companyLogoUrl: result.logoUrl
          }));
        }
        
        // Clean up preview URL
        if (previewUrl) {
          URL.revokeObjectURL(previewUrl);
        }
        
        // Reset state
        setLogoFile(null);
        setPreviewUrl(null);
        setHasChanges(false);
        
        showToast(t('settings.logoUpdatedSuccess'), 'success');
      } else {
        const error = await response.json();
        showToast(error.error || t('settings.failedToUpdateLogo'), 'error');
      }
    } catch (error) {
      console.error('Error updating logo:', error);
      showToast(t('settings.failedToUpdateLogo'), 'error');
    } finally {
      setIsSavingLogo(false);
    }
  };

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">{t('settings.title')}</h1>
        <p className="text-gray-600 dark:text-gray-400 mt-2">
          {t('settings.manageAdminPreferences')}
        </p>
      </div>

      <div className="space-y-6">
        {/* Company Logo Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <ImageIcon className="h-5 w-5 mr-2" />
              {t('settings.companyLogo')}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label className="text-sm font-medium">
                  {hasChanges ? t('settings.logoPreview') : t('settings.currentLogo')}
                </Label>
                <div className="flex items-center space-x-4">
                  {previewUrl ? (
                    <div className="relative">
                      <img 
                        src={previewUrl} 
                        alt={t('settings.logoPreview')} 
                        className="h-16 w-16 object-contain rounded border"
                      />
                      <button
                        onClick={handleRemoveLogo}
                        className="absolute -top-2 -right-2 h-6 w-6 bg-red-500 text-white rounded-full flex items-center justify-center hover:bg-red-600 transition-colors"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ) : admin?.companyLogoUrl && !hasChanges ? (
                    <div className="relative">
                      <img 
                        src={admin.companyLogoUrl} 
                        alt={t('settings.companyLogo')} 
                        className="h-16 w-16 object-contain rounded border"
                      />
                      <button
                        onClick={handleRemoveLogo}
                        className="absolute -top-2 -right-2 h-6 w-6 bg-red-500 text-white rounded-full flex items-center justify-center hover:bg-red-600 transition-colors"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ) : (
                    <div className="h-16 w-16 bg-gray-100 dark:bg-gray-800 rounded border flex items-center justify-center">
                      <ImageIcon className="h-8 w-8 text-gray-400" />
                    </div>
                  )}
                  <div className="space-y-1">
                    <p className="text-sm font-medium">{admin?.companyName}</p>
                    <p className="text-xs text-gray-500">
                      {hasChanges 
                        ? (logoFile ? t('settings.newLogoSelected') : t('settings.logoWillBeRemoved'))
                        : (admin?.companyLogoUrl ? t('settings.logoUploaded') : t('settings.noLogoUploaded'))
                      }
                    </p>
                    {hasChanges && (
                      <p className="text-xs text-amber-600 font-medium">
                        {t('settings.changesNotSaved')}
                      </p>
                    )}
                  </div>
                </div>
              </div>
              
              <div className="space-y-2">
                <Label className="text-sm font-medium">{t('settings.uploadNewLogo')}</Label>
                <div className="flex items-center space-x-2">
                  <Input
                    type="file"
                    accept="image/*"
                    onChange={handleLogoChange}
                    className="flex-1"
                    disabled={isSavingLogo}
                  />
                </div>
                <p className="text-xs text-gray-500">
                  {t('settings.logoFormatsSupported')}
                </p>
              </div>

              {/* Save/Cancel buttons */}
              {hasChanges && (
                <div className="flex items-center space-x-2 pt-2 border-t">
                  <Button
                    onClick={handleSaveLogo}
                    disabled={isSavingLogo}
                    className="flex-1"
                  >
                    {isSavingLogo ? (
                      t('common.saving')
                    ) : (
                      <>
                        <Save className="h-4 w-4 mr-2" />
                        {t('settings.saveChanges')}
                      </>
                    )}
                  </Button>
                  <Button
                    onClick={handleCancelChanges}
                    disabled={isSavingLogo}
                    variant="outline"
                    className="flex-1"
                  >
                    <RotateCcw className="h-4 w-4 mr-2" />
                    {t('common.cancel')}
                  </Button>
                </div>
              )}
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
                <p className="text-sm text-gray-500 dark:text-gray-400">
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
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {t('settings.selectLanguage')}
                </p>
              </div>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="w-32">
                    <Languages className="h-4 w-4 mr-2" />
                    {i18n.language === 'es' ? t('settings.spanish') : t('settings.english')}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  <DropdownMenuItem onClick={() => handleLanguageChange('en')}>
                    {t('settings.english')}
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleLanguageChange('es')}>
                    {t('settings.spanish')}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </CardContent>
        </Card>

        {/* Additional Settings Placeholder */}
        <Card>
          <CardHeader>
            <CardTitle>{t('settings.systemPreferences')}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {t('settings.additionalSystemSettings')}
            </p>
          </CardContent>
        </Card>
      </div>

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