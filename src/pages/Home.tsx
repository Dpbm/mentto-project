import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Plus, Target, Calendar, TrendingUp, LogOut } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface OKR {
  id: string;
  title: string;
  description: string;
  objective: string;
  key_results: any;
  quarter: string;
  year: number;
  status: string;
  progress: number;
  created_at: string;
  updated_at: string;
}

const Home = () => {
  const { user, signOut } = useAuth();
  const { toast } = useToast();
  const [okrs, setOkrs] = useState<OKR[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchOKRs();
  }, []);

  const fetchOKRs = async () => {
    try {
      const { data, error } = await supabase
        .from('okrs')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        toast({
          title: 'Error',
          description: 'Failed to fetch OKRs',
          variant: 'destructive',
        });
      } else {
        setOkrs(data || []);
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'An unexpected error occurred',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    const { error } = await signOut();
    if (error) {
      toast({
        title: 'Error',
        description: 'Failed to sign out',
        variant: 'destructive',
      });
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-500';
      case 'completed':
        return 'bg-blue-500';
      case 'archived':
        return 'bg-gray-500';
      default:
        return 'bg-gray-500';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Target className="h-8 w-8 text-primary" />
            <h1 className="text-2xl font-bold">OKR Manager</h1>
          </div>
          <div className="flex items-center space-x-4">
            <span className="text-sm text-muted-foreground">
              Welcome, {user?.email}
            </span>
            <Button onClick={handleSignOut} variant="outline" size="sm">
              <LogOut className="h-4 w-4 mr-2" />
              Sign Out
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        {/* Actions */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-3xl font-bold">Your OKRs</h2>
            <p className="text-muted-foreground mt-2">
              Manage your objectives and key results
            </p>
          </div>
          <Link to="/okrs/new">
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              New OKR
            </Button>
          </Link>
        </div>

        {/* OKRs Grid */}
        {okrs.length === 0 ? (
          <div className="text-center py-12">
            <Target className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-xl font-semibold mb-2">No OKRs yet</h3>
            <p className="text-muted-foreground mb-4">
              Start by creating your first OKR to track your objectives
            </p>
            <Link to="/okrs/new">
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Create your first OKR
              </Button>
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {okrs.map((okr) => (
              <Link key={okr.id} to={`/okrs/${okr.id}`}>
                <Card className="hover:shadow-lg transition-shadow cursor-pointer">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <Badge 
                        className={`${getStatusColor(okr.status)} text-white`}
                      >
                        {okr.status}
                      </Badge>
                      <div className="flex items-center text-sm text-muted-foreground">
                        <Calendar className="h-4 w-4 mr-1" />
                        {okr.quarter} {okr.year}
                      </div>
                    </div>
                    <CardTitle className="line-clamp-2">{okr.title}</CardTitle>
                    <CardDescription className="line-clamp-3">
                      {okr.description}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-medium">Progress</span>
                          <span className="text-sm text-muted-foreground">
                            {okr.progress}%
                          </span>
                        </div>
                        <Progress value={okr.progress} className="h-2" />
                      </div>
                      
                      <div className="flex items-center text-sm text-muted-foreground">
                        <TrendingUp className="h-4 w-4 mr-1" />
                        {Array.isArray(okr.key_results) ? okr.key_results.length : 0} Key Results
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </main>
    </div>
  );
};

export default Home;