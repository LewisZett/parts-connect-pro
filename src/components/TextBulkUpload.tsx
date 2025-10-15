import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { FileText, Loader2, Sparkles } from 'lucide-react';
import { Card } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';

export const TextBulkUpload = () => {
  const [text, setText] = useState('');
  const [processing, setProcessing] = useState(false);
  const [open, setOpen] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!text.trim()) {
      toast({
        title: 'Empty input',
        description: 'Please paste your parts list',
        variant: 'destructive',
      });
      return;
    }

    try {
      setProcessing(true);

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase.functions.invoke('parse-parts-text', {
        body: { text, userId: user.id },
      });

      if (error) throw error;

      toast({
        title: 'Success!',
        description: `Added ${data.count} parts to your listings`,
      });

      setText('');
      setOpen(false);
      window.location.reload();
    } catch (error: any) {
      console.error('Error parsing text:', error);
      toast({
        title: 'Parsing failed',
        description: error.message || 'Failed to parse parts list. Please check your format and try again.',
        variant: 'destructive',
      });
    } finally {
      setProcessing(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Card className="p-6 mb-6 cursor-pointer hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <FileText className="w-6 h-6 text-primary" />
              <div>
                <h3 className="font-semibold">Bulk Paste Parts List</h3>
                <p className="text-sm text-muted-foreground">
                  Paste your parts list and AI will automatically organize them
                </p>
              </div>
            </div>
            <Sparkles className="w-5 h-5 text-primary" />
          </div>
        </Card>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Paste Your Parts List</DialogTitle>
          <DialogDescription>
            Paste your parts in any format - lists, paragraphs, or tables. AI will extract and organize them.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Textarea
              placeholder="Example:&#10;- 2x4 lumber, $5 each, new condition&#10;- Used copper pipes, 10ft, $50&#10;- Drywall sheets (4x8), like new, $15/sheet&#10;&#10;Or just paste your list in any format..."
              value={text}
              onChange={(e) => setText(e.target.value)}
              className="min-h-[300px] font-mono text-sm"
              disabled={processing}
            />
            <p className="text-xs text-muted-foreground mt-2">
              Tip: Include prices, conditions, and descriptions for better results
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setText('');
                setOpen(false);
              }}
              disabled={processing}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={processing || !text.trim()}
              className="flex-1"
            >
              {processing ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 mr-2" />
                  Parse & Add Parts
                </>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};