import { useState, useRef } from "react";
import { Upload, X, FileText, Image } from "lucide-react";
import { Button } from "@/components/ui/button";
import { uploadFile, getPublicUrl } from "@/lib/supabase";
import { useToast } from "@/hooks/use-toast";

interface FileUploadProps {
  onFileUploaded: (url: string, fileName: string) => void;
  accept?: string;
  maxSize?: number; // in MB
  bucket: string;
  folder: string;
  placeholder?: string;
  disabled?: boolean;
}

const FileUpload = ({ 
  onFileUploaded, 
  accept = "image/*,.pdf,.doc,.docx", 
  maxSize = 10,
  bucket,
  folder,
  placeholder = "Click to upload or drag and drop",
  disabled = false
}: FileUploadProps) => {
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const validateFile = (file: File) => {
    if (file.size > maxSize * 1024 * 1024) {
      toast({
        title: "File too large",
        description: `File size must be less than ${maxSize}MB`,
        variant: "destructive"
      });
      return false;
    }
    return true;
  };

  const handleFileUpload = async (file: File) => {
    if (!validateFile(file)) return;

    setIsUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
      const filePath = `${folder}/${fileName}`;

      await uploadFile(file, bucket, filePath);
      const publicUrl = getPublicUrl(bucket, filePath);
      
      onFileUploaded(publicUrl, file.name);
      
      toast({
        title: "File uploaded successfully",
        description: `${file.name} has been uploaded`,
      });
    } catch (error) {
      console.error('Upload error:', error);
      toast({
        title: "Upload failed",
        description: "There was an error uploading your file",
        variant: "destructive"
      });
    } finally {
      setIsUploading(false);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    if (disabled) return;
    
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      handleFileUpload(files[0]);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleFileUpload(files[0]);
    }
  };

  const getFileIcon = () => {
    if (accept.includes('image')) {
      return <Image className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />;
    }
    return <FileText className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />;
  };

  return (
    <div
      className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
        disabled 
          ? 'border-muted-foreground/20 bg-muted/30 cursor-not-allowed opacity-50' 
          : `cursor-pointer ${
              isDragging
                ? 'border-automotive-blue bg-automotive-blue/5'
                : 'border-automotive-blue/30 hover:border-automotive-blue/50'
            }`
      } ${isUploading ? 'pointer-events-none opacity-50' : ''}`}
      onDragOver={disabled ? undefined : handleDragOver}
      onDragLeave={disabled ? undefined : handleDragLeave}
      onDrop={disabled ? undefined : handleDrop}
      onClick={disabled ? undefined : () => fileInputRef.current?.click()}
    >
      <input
        ref={fileInputRef}
        type="file"
        accept={accept}
        onChange={handleFileSelect}
        className="hidden"
        disabled={disabled}
      />
      
      {isUploading ? (
        <div className="flex flex-col items-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-automotive-blue mb-2"></div>
          <p className="text-sm text-muted-foreground">Uploading...</p>
        </div>
      ) : (
        <>
          {getFileIcon()}
          <p className="text-sm text-muted-foreground">
            {placeholder}
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            {accept.includes('image') ? 'PNG, JPG' : 'PDF, DOC'} up to {maxSize}MB
          </p>
        </>
      )}
    </div>
  );
};

export default FileUpload;