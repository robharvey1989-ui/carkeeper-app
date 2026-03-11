import { useMemo, useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { X, Download, ZoomIn, ZoomOut, RotateCw } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface DocumentPreviewProps {
  document: {
    name: string;
    url: string;
  } | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const DocumentPreview = ({ document, open, onOpenChange }: DocumentPreviewProps) => {
  const DOC_DEBUG = (import.meta as any)?.env?.VITE_DOC_PREVIEW_DEBUG === "true";
  const dbg = useMemo(() => ({
    log: (...args: any[]) => DOC_DEBUG && console.log(...args),
    warn: (...args: any[]) => DOC_DEBUG && console.warn(...args),
    error: (...args: any[]) => DOC_DEBUG && console.error(...args),
  }), [DOC_DEBUG]);

  const [zoom, setZoom] = useState(100);
  const [rotation, setRotation] = useState(0);
  const [signedUrl, setSignedUrl] = useState<string>('');
  const [urlLoading, setUrlLoading] = useState(true);

  // Generate signed URL for private documents
  useEffect(() => {
    if (!document || !open) return;
    
    const generateSignedUrl = async () => {
      setUrlLoading(true);
      dbg.log('[DEBUG] Generating signed URL for document:', document.url);
      try {
        // Early return: if not a Supabase storage URL, just return as-is
        if (!/\/storage\/v1\/object\//.test(document.url)) {
          dbg.log('[DEBUG] Not a Supabase Storage URL, using original');
          setSignedUrl(document.url);
          return;
        }

        // Extract the file path from various URL formats
        const BUCKET = 'car-documents';
        let filePath: string | null = null;

        const extractPath = (urlStr: string): string | null => {
          try {
            const base = (import.meta as any)?.env?.VITE_SUPABASE_URL || undefined;
            const u = new URL(urlStr, base);
            const path = u.pathname;

            const patterns = [
              `/storage/v1/object/public/${BUCKET}/`,
              `/storage/v1/object/sign/${BUCKET}/`,
              `/storage/v1/object/${BUCKET}/`,
              `/${BUCKET}/`
            ];

            for (const p of patterns) {
              const idx = path.indexOf(p);
              if (idx !== -1) {
                let after = path.substring(idx + p.length).replace(/^\/+/, '');
                after = decodeURIComponent(after);
                return after;
              }
            }
            return null;
          } catch (e) {
            dbg.warn('[DEBUG] URL parse failed, fallback scan', e);
            const raw = urlStr;
            const marker = `/${BUCKET}/`;
            const i = raw.indexOf(marker);
            if (i !== -1) {
              const rest = raw.substring(i + marker.length).split('?')[0];
              return decodeURIComponent(rest.replace(/^\/+/, ''));
            }
            return null;
          }
        };

        filePath = extractPath(document.url);
        dbg.log('[DEBUG] Extracted filePath:', filePath);

        if (!filePath) {
          dbg.log('[DEBUG] No valid filePath found, using original URL');
          setSignedUrl(document.url);
          return;
        }

        // Generate a signed URL for the private bucket
        const { data, error } = await supabase.storage
          .from(BUCKET)
          .createSignedUrl(filePath, 3600); // 1 hour expiry
        
        if (error) {
          dbg.error('[DEBUG] Error generating signed URL:', error);
          setSignedUrl(document.url); // Fallback to original URL
        } else {
          dbg.log('[DEBUG] Generated signed URL:', data.signedUrl);
          setSignedUrl(data.signedUrl);
        }
      } catch (error) {
        dbg.error('[DEBUG] Exception generating signed URL:', error);
        setSignedUrl(document.url); // Fallback to original URL
      } finally {
        setUrlLoading(false);
      }
    };

    generateSignedUrl();
  }, [document, open, dbg]);

  if (!document) return null;

  // Determine file type based on URL or name
  const getFileType = (url: string, name: string) => {
    const nameExtension = name.includes('.') ? name.split('.').pop()?.toLowerCase() : '';
    const urlExtension = url.split('.').pop()?.toLowerCase() || '';
    const extension = nameExtension || urlExtension;
    
    dbg.log('Document preview - Name:', name, 'Extension:', extension, 'URL:', url);
    
    if (['pdf'].includes(extension) || ['pdf'].includes(urlExtension)) {
      return 'pdf';
    }
    if (['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp', 'svg'].includes(extension) || 
        ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp', 'svg'].includes(urlExtension)) {
      return 'image';
    }
    if (['txt', 'csv', 'json', 'xml', 'log'].includes(extension) || 
        ['txt', 'csv', 'json', 'xml', 'log'].includes(urlExtension)) {
      return 'text';
    }
    if (['doc', 'docx', 'rtf'].includes(extension) || 
        ['doc', 'docx', 'rtf'].includes(urlExtension)) {
      return 'document';
    }
    if (['xls', 'xlsx', 'csv'].includes(extension) || 
        ['xls', 'xlsx', 'csv'].includes(urlExtension)) {
      return 'spreadsheet';
    }
    if (['ppt', 'pptx'].includes(extension) || 
        ['ppt', 'pptx'].includes(urlExtension)) {
      return 'presentation';
    }
    return 'unknown';
  };

  const fileType = getFileType(document.url, document.name);

  const handleZoomIn = () => setZoom(prev => Math.min(prev + 25, 200));
  const handleZoomOut = () => setZoom(prev => Math.max(prev - 25, 50));
  const handleRotate = () => setRotation(prev => (prev + 90) % 360);
  const resetView = () => {
    setZoom(100);
    setRotation(0);
  };

  const renderPreview = () => {
    if (urlLoading) {
      return (
        <div className="w-full h-full flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full mx-auto mb-2"></div>
            <p className="text-sm text-muted-foreground">Loading preview...</p>
          </div>
        </div>
      );
    }

    const previewUrl = signedUrl || document.url;
    switch (fileType) {
      case 'pdf':
        return (
          <div className="w-full h-full flex items-center justify-center">
            <iframe
              src={`${previewUrl}#zoom=${zoom}`}
              className="w-full h-full border-0 rounded-lg"
              title={document.name}
            />
          </div>
        );
      
      case 'image':
        return (
          <div className="w-full h-full flex items-center justify-center overflow-auto">
            <img
              src={previewUrl}
              alt={document.name}
              className="max-w-full max-h-full object-contain transition-transform duration-200"
              style={{ 
                transform: `scale(${zoom / 100}) rotate(${rotation}deg)`,
                transformOrigin: 'center'
              }}
              onError={(e) => {
                e.currentTarget.src = '/placeholder.svg';
              }}
            />
          </div>
        );
      
      case 'text':
        return (
          <div className="w-full h-full">
            <iframe
              src={previewUrl}
              className="w-full h-full border-0 rounded-lg bg-background"
              title={document.name}
            />
          </div>
        );
      
      case 'document':
      case 'spreadsheet':
      case 'presentation':
        return (
          <div className="w-full h-full">
            <iframe
              src={`https://docs.google.com/gview?url=${encodeURIComponent(signedUrl || document.url)}&embedded=true`}
              className="w-full h-full border-0 rounded-lg"
              title={document.name}
              onError={(e) => {
                // Fallback to download interface if Google Viewer fails
                e.currentTarget.style.display = 'none';
                const fallback = e.currentTarget.nextElementSibling as HTMLElement;
                if (fallback) fallback.style.display = 'block';
              }}
            />
            {/* Fallback content - initially hidden */}
            <div className="w-full h-full flex items-center justify-center text-center" style={{ display: 'none' }}>
              <div className="space-y-4">
                <div className="text-6xl">
                  {fileType === 'document' && '📝'}
                  {fileType === 'spreadsheet' && '📊'}
                  {fileType === 'presentation' && '📽️'}
                </div>
                <div>
                  <h3 className="text-lg font-medium mb-2">
                    {fileType === 'document' && 'Word Document'}
                    {fileType === 'spreadsheet' && 'Spreadsheet'}
                    {fileType === 'presentation' && 'Presentation'}
                  </h3>
                  <p className="text-muted-foreground mb-4">
                    Preview unavailable. You can download it to view with the appropriate application.
                  </p>
                  <Button asChild>
                    <a 
                      href={signedUrl || document.url} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="flex items-center gap-2"
                    >
                      <Download className="w-4 h-4" />
                      Download to view
                    </a>
                  </Button>
                </div>
              </div>
            </div>
          </div>
        );
      
      default:
        return (
          <div className="w-full h-full flex items-center justify-center text-center">
            <div className="space-y-4">
              <div className="text-6xl">📄</div>
              <div>
                <h3 className="text-lg font-medium mb-2">Preview not available</h3>
                <p className="text-muted-foreground mb-4">
                  This file type cannot be previewed in the browser.
                </p>
                <Button asChild>
                  <a 
                    href={signedUrl || document.url} 
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2"
                  >
                    <Download className="w-4 h-4" />
                    Download to view
                  </a>
                </Button>
              </div>
            </div>
          </div>
        );
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl h-[90vh] flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <div className="flex items-center justify-between">
            <DialogTitle className="flex items-center gap-2 text-base">
              📄 {document.name}
            </DialogTitle>
            <div className="flex items-center gap-2">
              {(fileType === 'image' || fileType === 'pdf') && (
                <>
                  <Button variant="ghost" size="sm" onClick={handleZoomOut}>
                    <ZoomOut className="w-4 h-4" />
                  </Button>
                  <span className="text-sm font-medium min-w-[3rem] text-center">
                    {zoom}%
                  </span>
                  <Button variant="ghost" size="sm" onClick={handleZoomIn}>
                    <ZoomIn className="w-4 h-4" />
                  </Button>
                </>
              )}
              {fileType === 'image' && (
                <Button variant="ghost" size="sm" onClick={handleRotate}>
                  <RotateCw className="w-4 h-4" />
                </Button>
              )}
              <Button variant="ghost" size="sm" asChild>
                <a 
                  href={signedUrl || document.url} 
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1"
                >
                  <Download className="w-4 h-4" />
                </a>
              </Button>
              <Button variant="ghost" size="sm" onClick={() => onOpenChange(false)}>
                <X className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </DialogHeader>
        
        <div className="flex-1 overflow-hidden rounded-lg border bg-muted/10">
          {renderPreview()}
        </div>
        
        <div className="flex-shrink-0 flex justify-between items-center pt-2">
          <div className="text-sm text-muted-foreground">
            {fileType === 'document' && 'Word Document'}
            {fileType === 'spreadsheet' && 'Spreadsheet'}  
            {fileType === 'presentation' && 'Presentation'}
            {fileType === 'pdf' && 'PDF file'}
            {fileType === 'image' && 'Image file'}
            {fileType === 'text' && 'Text file'}
            {fileType === 'unknown' && 'Unknown file type'}
          </div>
          {(fileType === 'image' || fileType === 'pdf') && (
            <Button variant="ghost" size="sm" onClick={resetView}>
              Reset View
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default DocumentPreview;
