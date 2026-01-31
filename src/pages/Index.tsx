import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ClockTab } from '@/components/ClockTab';
import { LogsTab } from '@/components/LogsTab';
import { Button } from '@/components/ui/button';
import { Clock, List, LogOut } from 'lucide-react';
import { TitlesProvider } from '@/contexts/TitlesContext';

export default function Index() {
  const { user, loading, signOut } = useAuth();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  return (
    <TitlesProvider>
      <div className="flex h-screen flex-col overflow-hidden bg-background safe-area-inset-top safe-area-inset-bottom">
        {/* Header */}
        <header className="flex items-center justify-between border-b border-border px-4 py-3">
          <h1 className="text-lg font-semibold text-foreground">Time Tracker</h1>
          <Button
            variant="ghost"
            size="icon"
            onClick={signOut}
            className="h-9 w-9 text-muted-foreground"
          >
            <LogOut className="h-5 w-5" />
          </Button>
        </header>

        {/* Main Content with Tabs */}
        <Tabs defaultValue="clock" className="flex min-h-0 flex-1 flex-col">
          <TabsContent value="clock" className="m-0 flex min-h-0 flex-1 flex-col data-[state=inactive]:hidden">
            <ClockTab />
          </TabsContent>
          <TabsContent value="logs" className="m-0 flex min-h-0 flex-1 flex-col overflow-hidden data-[state=inactive]:hidden">
            <LogsTab />
          </TabsContent>

          {/* Bottom Tab Bar */}
          <TabsList className="h-auto shrink-0 rounded-none border-t border-border bg-background p-0">
            <TabsTrigger
              value="clock"
              className="flex-1 flex-col gap-1 rounded-none py-3 data-[state=active]:bg-transparent data-[state=active]:text-primary"
            >
              <Clock className="h-5 w-5" />
              <span className="text-xs">Clock</span>
            </TabsTrigger>
            <TabsTrigger
              value="logs"
              className="flex-1 flex-col gap-1 rounded-none py-3 data-[state=active]:bg-transparent data-[state=active]:text-primary"
            >
              <List className="h-5 w-5" />
              <span className="text-xs">Logs</span>
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>
    </TitlesProvider>
  );
}
