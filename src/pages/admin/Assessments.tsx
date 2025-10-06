import { useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useClinicalAssessments } from '@/hooks/useClinicalAssessments';
import { ClipboardList, Clock, FileText, Users, TrendingUp } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export default function Assessments() {
  const { assessments, isLoading } = useClinicalAssessments();
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  const categories = Array.from(new Set(assessments.map((a) => a.category)));

  const filteredAssessments = assessments.filter(
    (a) => selectedCategory === 'all' || a.category === selectedCategory
  );

  const getCategoryColor = (category: string) => {
    const colors: Record<string, string> = {
      Depression: 'blue',
      Anxiety: 'purple',
      PTSD: 'orange',
      'Substance Use': 'red',
      default: 'gray',
    };
    return colors[category] || colors.default;
  };

  return (
    <DashboardLayout>
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-7xl mx-auto space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold">Clinical Assessments</h1>
              <p className="text-muted-foreground mt-1">
                Standardized assessment tools with automatic scoring
              </p>
            </div>
            <Button>
              <ClipboardList className="h-4 w-4 mr-2" />
              Create Custom Assessment
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">Total Assessments</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{assessments.length}</div>
                <p className="text-xs text-muted-foreground mt-1">Available tools</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">Categories</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{categories.length}</div>
                <p className="text-xs text-muted-foreground mt-1">Assessment types</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">Avg. Time</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {Math.round(
                    assessments.reduce((sum, a) => sum + (a.estimated_minutes || 0), 0) /
                      assessments.length
                  )}{' '}
                  min
                </div>
                <p className="text-xs text-muted-foreground mt-1">To complete</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">Pre-Built</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {assessments.filter((a) => !a.is_custom).length}
                </div>
                <p className="text-xs text-muted-foreground mt-1">Validated tools</p>
              </CardContent>
            </Card>
          </div>

          <Tabs defaultValue="all" onValueChange={setSelectedCategory}>
            <TabsList>
              <TabsTrigger value="all">All Assessments</TabsTrigger>
              {categories.map((cat) => (
                <TabsTrigger key={cat} value={cat}>
                  {cat}
                </TabsTrigger>
              ))}
            </TabsList>

            <TabsContent value={selectedCategory} className="space-y-4 mt-6">
              {isLoading ? (
                <div className="text-center py-8 text-muted-foreground">Loading assessments...</div>
              ) : filteredAssessments.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No assessments found
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filteredAssessments.map((assessment) => (
                    <Card key={assessment.id} className="hover:shadow-md transition-shadow">
                      <CardHeader>
                        <div className="flex items-start justify-between">
                          <div className="space-y-1">
                            <CardTitle className="text-lg">{assessment.acronym}</CardTitle>
                            <CardDescription className="text-sm">
                              {assessment.assessment_name}
                            </CardDescription>
                          </div>
                          <Badge variant="outline">{assessment.category}</Badge>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <p className="text-sm text-muted-foreground">{assessment.description}</p>

                        <div className="flex items-center justify-between text-sm">
                          <div className="flex items-center text-muted-foreground">
                            <FileText className="h-4 w-4 mr-1" />
                            {assessment.total_items} items
                          </div>
                          <div className="flex items-center text-muted-foreground">
                            <Clock className="h-4 w-4 mr-1" />
                            {assessment.estimated_minutes} min
                          </div>
                        </div>

                        <div className="space-y-2">
                          <div className="text-xs font-medium text-muted-foreground">
                            Severity Ranges:
                          </div>
                          <div className="flex flex-wrap gap-1">
                            {assessment.scoring_algorithm.interpretation.map((interp, idx) => (
                              <Badge key={idx} variant="secondary" className="text-xs">
                                {interp.severity}
                              </Badge>
                            ))}
                          </div>
                        </div>

                        <div className="flex space-x-2 pt-2">
                          <Button size="sm" className="flex-1">
                            <Users className="h-4 w-4 mr-1" />
                            Administer
                          </Button>
                          <Button size="sm" variant="outline">
                            <TrendingUp className="h-4 w-4" />
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </DashboardLayout>
  );
}
