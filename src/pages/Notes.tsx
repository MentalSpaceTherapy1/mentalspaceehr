import { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Plus, Search, FileText, Brain, Lock, AlertTriangle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';

interface ClinicalNote {
  id: string;
  client_id: string;
  note_type: string;
  note_format: string;
  date_of_service: string;
  ai_generated: boolean;
  ai_generation_status: string;
  ai_confidence_score: number | null;
  risk_flags: any; // JSONB type from database
  locked: boolean;
  requires_supervision: boolean;
  billing_status: string;
  clients?: {
    first_name: string;
    last_name: string;
  };
}

export default function Notes() {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [notes, setNotes] = useState<ClinicalNote[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    loadNotes();
  }, []);

  const loadNotes = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('clinical_notes')
        .select(`
          *,
          clients (
            first_name,
            last_name
          )
        `)
        .order('date_of_service', { ascending: false })
        .order('created_at', { ascending: false });

      if (error) throw error;
      setNotes(data || []);
    } catch (error) {
      console.error('Error loading notes:', error);
      toast({
        title: 'Error',
        description: 'Failed to load clinical notes',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const filteredNotes = notes.filter((note) => {
    const clientName = `${note.clients?.first_name} ${note.clients?.last_name}`.toLowerCase();
    const query = searchQuery.toLowerCase();
    return clientName.includes(query) || note.note_type.toLowerCase().includes(query);
  });

  const formatNoteType = (type: string) => {
    return type.split('_').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ');
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Clinical Notes</h1>
            <p className="text-muted-foreground">
              Manage client clinical documentation
            </p>
          </div>
          <Button onClick={() => navigate('/notes/new')}>
            <Plus className="h-4 w-4 mr-2" />
            New Note
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Search Notes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by client name or note type..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-0">
            {loading ? (
              <div className="p-8 text-center text-muted-foreground">Loading notes...</div>
            ) : filteredNotes.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground">
                {searchQuery ? 'No notes found matching your search' : 'No clinical notes yet'}
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Client</TableHead>
                    <TableHead>Date of Service</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Format</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredNotes.map((note) => (
                    <TableRow key={note.id}>
                      <TableCell className="font-medium">
                        {note.clients?.first_name} {note.clients?.last_name}
                      </TableCell>
                      <TableCell>
                        {format(new Date(note.date_of_service), 'MMM d, yyyy')}
                      </TableCell>
                      <TableCell>{formatNoteType(note.note_type)}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{note.note_format}</Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2 items-center">
                          {note.ai_generated && (
                            <Badge variant="secondary">
                              <Brain className="h-3 w-3 mr-1" />
                              AI
                            </Badge>
                          )}
                          {note.locked && (
                            <Badge variant="secondary">
                              <Lock className="h-3 w-3 mr-1" />
                              Locked
                            </Badge>
                          )}
                          {note.risk_flags && Array.isArray(note.risk_flags) && note.risk_flags.length > 0 && (
                            <Badge variant="destructive">
                              <AlertTriangle className="h-3 w-3 mr-1" />
                              Risk
                            </Badge>
                          )}
                          {note.requires_supervision && (
                            <Badge variant="outline">Needs Supervision</Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => navigate(`/notes/${note.id}`)}
                        >
                          <FileText className="h-4 w-4 mr-1" />
                          View
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
