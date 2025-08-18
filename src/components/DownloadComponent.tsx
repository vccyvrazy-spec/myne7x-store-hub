import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { Download, Clock, CheckCircle } from 'lucide-react';

interface DownloadComponentProps {
  product: {
    id: string;
    title: string;
    file_url?: string;
  };
  onClose: () => void;
}

const DownloadComponent = ({ product, onClose }: DownloadComponentProps) => {
  const [countdown, setCountdown] = useState(30);
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadComplete, setDownloadComplete] = useState(false);

  useEffect(() => {
    if (countdown > 0 && !downloadComplete) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    } else if (countdown === 0 && !downloadComplete) {
      startDownload();
    }
  }, [countdown, downloadComplete]);

  const startDownload = async () => {
    setIsDownloading(true);
    
    try {
      if (product.file_url) {
        // Create a temporary link to download the file
        const link = document.createElement('a');
        link.href = product.file_url;
        link.download = `${product.title}`;
        link.target = '_blank';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        setDownloadComplete(true);
        toast({
          title: "Download Started",
          description: `${product.title} download has begun`,
        });
      } else {
        throw new Error('No file URL found');
      }
    } catch (error) {
      toast({
        title: "Download Failed",
        description: "Unable to download the file. Please contact support.",
        variant: "destructive"
      });
    } finally {
      setIsDownloading(false);
    }
  };

  const progressValue = ((30 - countdown) / 30) * 100;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <Card className="w-full max-w-md mx-4 card-neon">
        <CardHeader className="text-center">
          <CardTitle className="flex items-center justify-center gap-2 text-glow">
            <Download className="h-5 w-5" />
            Download {product.title}
          </CardTitle>
          <CardDescription>
            {downloadComplete ? 'Download completed!' : 'Preparing your download...'}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {!downloadComplete && (
            <>
              <div className="text-center">
                <div className="text-6xl font-bold text-neon-cyan mb-2">
                  {countdown}
                </div>
                <p className="text-sm text-muted-foreground">
                  {countdown > 0 ? 'seconds remaining' : 'Starting download...'}
                </p>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Progress</span>
                  <span>{Math.round(progressValue)}%</span>
                </div>
                <Progress value={progressValue} className="h-2" />
              </div>

              {isDownloading && (
                <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                  <Clock className="h-4 w-4 animate-spin" />
                  Initiating download...
                </div>
              )}
            </>
          )}

          {downloadComplete && (
            <div className="text-center space-y-4">
              <CheckCircle className="h-16 w-16 text-green-500 mx-auto" />
              <p className="text-sm text-muted-foreground">
                Your download should start automatically. If it doesn't, you can try downloading again.
              </p>
              <Button 
                onClick={startDownload}
                variant="outline"
                className="w-full"
              >
                <Download className="h-4 w-4 mr-2" />
                Download Again
              </Button>
            </div>
          )}

          <Button 
            onClick={onClose}
            variant="ghost"
            className="w-full"
          >
            Close
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default DownloadComponent;