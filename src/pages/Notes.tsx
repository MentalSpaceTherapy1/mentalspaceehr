import { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
import { FileText, Brain, Lock, AlertTriangle, Target, Calendar, Phone, Users, Search, Plus, ClipboardList, Clock } from 'lucide-react';
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

  const noteTypes = [
    {
      name: 'Intake Assessment',
      icon: ClipboardList,
      color: 'bg-blue-500',
      duration: '45-60 min',
      description: 'Comprehensive initial assessment for new clients',
      route: '/intake-assessment'
    },
    {
      name: 'Progress Note',
      icon: FileText,
      color: 'bg-green-500',
      duration: '15-20 min',
      description: 'Document therapy session progress and interventions',
      route: '/progress-note',
      badge: 'Quick'
    },
    {
      name: 'Treatment Plan',
      icon: Target,
      color: 'bg-purple-500',
      duration: '30-45 min',
      description: 'Create and update comprehensive treatment plans',
      route: '/treatment-plan'
    },
    {
      name: 'Cancellation Note',
      icon: Calendar,
      color: 'bg-orange-500',
      duration: '5 min',
      description: 'Document session cancellations and reasons',
      route: '/cancellation-note'
    },
    {
      name: 'Contact Note',
      icon: Phone,
      color: 'bg-teal-500',
      duration: '10 min',
      description: 'Record brief client contacts and communications',
      route: '/contact-note'
    },
    {
      name: 'Consultation Note',
      icon: Users,
      color: 'bg-pink-500',
      duration: '20 min',
      description: 'Document consultations with other providers',
      route: '/consultation-note'
    },
    {
      name: 'Miscellaneous Note',
      icon: FileText,
      color: 'bg-amber-500',
      duration: '10-15 min',
      description: 'Document other clinical activities and observations',
      route: '/miscellaneous-note'
    }
  ];

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Clinical Notes</h1>
          <p className="text-muted-foreground">
            Manage client clinical documentation
          </p>
        </div>

        <Tabs defaultValue="create" className="w-full">
          <TabsList className="grid w-full max-w-md grid-cols-2">
            <TabsTrigger value="create" className="gap-2">
              <Plus className="h-4 w-4" />
              Create New Note
            </TabsTrigger>
            <TabsTrigger value="my-notes" className="gap-2">
              <FileText className="h-4 w-4" />
              My Notes
            </TabsTrigger>
          </TabsList>

          <TabsContent value="create" className="space-y-6">
            <div className="space-y-2">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-2xl bg-primary">
                  <Plus className="h-6 w-6 text-primary-foreground" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold">Create New Note</h2>
                  <p className="text-muted-foreground">
                    Choose the type of clinical note you'd like to create
                  </p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {noteTypes.map((noteType) => {
                const Icon = noteType.icon;
                return (
                  <Card key={noteType.name} className="overflow-hidden hover:shadow-lg transition-shadow">
                    <CardContent className="p-6 space-y-4">
                      <div className="flex items-start justify-between">
                        <div className={`p-4 rounded-2xl ${noteType.color}`}>
                          <Icon className="h-8 w-8 text-white" />
                        </div>
                        {noteType.badge && (
                          <Badge variant="secondary" className="bg-green-100 text-green-800">
                            {noteType.badge}
                          </Badge>
                        )}
                      </div>
                      
                      <div className="space-y-2">
                        <h3 className="text-xl font-semibold">{noteType.name}</h3>
                        <div className="flex items-center gap-1 text-sm text-muted-foreground">
                          <Clock className="h-3 w-3" />
                          {noteType.duration}
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {noteType.description}
                        </p>
                      </div>

                      <Button 
                        className={`w-full ${noteType.color} hover:opacity-90`}
                        onClick={() => navigate(noteType.route)}
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Create {noteType.name}
                      </Button>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </TabsContent>

          <TabsContent value="my-notes" className="space-y-6">
            <Card>
              <CardContent className="pt-6">
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
                              onClick={() => {
                                if (note.note_type === 'intake_assessment') {
                                  navigate(`/intake-assessment?noteId=${note.id}`);
                                } else if (note.note_type === 'progress_note') {
                                  navigate(`/progress-note?noteId=${note.id}`);
                                } else {
                                  navigate(`/notes/${note.id}`);
                                }
                              }}
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
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
