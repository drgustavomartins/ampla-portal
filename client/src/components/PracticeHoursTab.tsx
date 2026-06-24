import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { AlertTriangle, CheckCircle2, Clock, Users } from 'lucide-react';

interface StudentPracticeHours {
  studentId: string;
  studentName: string;
  studentEmail: string;
  planName: string;
  totalRequiredHours: number;
  completedHours: number;
  pendingHours: number;
  percentageComplete: number;
  enrollmentDate: string;
  lastActivityDate: string | null;
  status: 'completed' | 'in-progress' | 'at-risk' | 'overdue';
}

export default function PracticeHoursTab() {
  const [students, setStudents] = useState<StudentPracticeHours[]>([]);
  const [filteredStudents, setFilteredStudents] = useState<StudentPracticeHours[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'completed' | 'in-progress' | 'at-risk' | 'overdue'>('all');
  const [sortBy, setSortBy] = useState<'pending-desc' | 'pending-asc' | 'percentage' | 'name'>('pending-desc');

  // Buscar dados de alunos com horas de prática
  useEffect(() => {
    const fetchPracticeHours = async () => {
      try {
        setLoading(true);
        const response = await fetch('/api/admin/practice-hours', {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
          }
        });

        if (!response.ok) {
          throw new Error('Falha ao carregar dados de prática supervisionada');
        }

        const data = await response.json();
        setStudents(data);
        applyFiltersAndSort(data, searchTerm, statusFilter, sortBy);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Erro desconhecido');
      } finally {
        setLoading(false);
      }
    };

    fetchPracticeHours();
  }, []);

  // Aplicar filtros e ordenação
  useEffect(() => {
    applyFiltersAndSort(students, searchTerm, statusFilter, sortBy);
  }, [searchTerm, statusFilter, sortBy, students]);

  const applyFiltersAndSort = (
    data: StudentPracticeHours[],
    search: string,
    status: string,
    sort: string
  ) => {
    let filtered = data;

    // Filtro por busca
    if (search) {
      filtered = filtered.filter(s =>
        s.studentName.toLowerCase().includes(search.toLowerCase()) ||
        s.studentEmail.toLowerCase().includes(search.toLowerCase())
      );
    }

    // Filtro por status
    if (status !== 'all') {
      filtered = filtered.filter(s => s.status === status);
    }

    // Ordenação
    switch (sort) {
      case 'pending-desc':
        filtered.sort((a, b) => b.pendingHours - a.pendingHours);
        break;
      case 'pending-asc':
        filtered.sort((a, b) => a.pendingHours - b.pendingHours);
        break;
      case 'percentage':
        filtered.sort((a, b) => a.percentageComplete - b.percentageComplete);
        break;
      case 'name':
        filtered.sort((a, b) => a.studentName.localeCompare(b.studentName));
        break;
    }

    setFilteredStudents(filtered);
  };

  const getStatusBadge = (status: StudentPracticeHours['status']) => {
    const config = {
      completed: { label: 'Completo', color: 'bg-green-100 text-green-800', icon: CheckCircle2 },
      'in-progress': { label: 'Em Progresso', color: 'bg-blue-100 text-blue-800', icon: Clock },
      'at-risk': { label: 'Atenção', color: 'bg-yellow-100 text-yellow-800', icon: AlertTriangle },
      overdue: { label: 'Vencido', color: 'bg-red-100 text-red-800', icon: AlertTriangle }
    };
    const { label, color, icon: Icon } = config[status];
    return (
      <Badge className={color} variant="outline">
        <Icon className="w-3 h-3 mr-1" />
        {label}
      </Badge>
    );
  };

  const getProgressColor = (percentage: number) => {
    if (percentage === 100) return 'bg-green-500';
    if (percentage >= 75) return 'bg-blue-500';
    if (percentage >= 50) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  const stats = {
    total: students.length,
    completed: students.filter(s => s.status === 'completed').length,
    inProgress: students.filter(s => s.status === 'in-progress').length,
    atRisk: students.filter(s => s.status === 'at-risk').length,
    overdue: students.filter(s => s.status === 'overdue').length
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Cards de resumo */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Completo</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.completed}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Em Progresso</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{stats.inProgress}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Atenção</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{stats.atRisk}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Vencido</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{stats.overdue}</div>
          </CardContent>
        </Card>
      </div>

      {/* Controles de filtro */}
      <Card>
        <CardHeader>
          <CardTitle>Filtros</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Buscar aluno</label>
              <Input
                placeholder="Nome ou email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Status</label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as any)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
              >
                <option value="all">Todos</option>
                <option value="completed">Completo</option>
                <option value="in-progress">Em Progresso</option>
                <option value="at-risk">Atenção</option>
                <option value="overdue">Vencido</option>
              </select>
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Ordenar por</label>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
              >
                <option value="pending-desc">Mais horas pendentes</option>
                <option value="pending-asc">Menos horas pendentes</option>
                <option value="percentage">Menor progresso</option>
                <option value="name">Nome (A-Z)</option>
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Lista de alunos */}
      <div className="space-y-4">
        {error && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {filteredStudents.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Users className="w-12 h-12 text-muted-foreground mx-auto mb-4 opacity-50" />
              <p className="text-muted-foreground">Nenhum aluno encontrado</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4">
            {filteredStudents.map((student) => (
              <Card key={student.studentId} className="hover:shadow-md transition-shadow">
                <CardContent className="pt-6">
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-start">
                    {/* Informações do aluno */}
                    <div className="space-y-1">
                      <h3 className="font-semibold text-base">{student.studentName}</h3>
                      <p className="text-sm text-muted-foreground">{student.studentEmail}</p>
                      <p className="text-xs text-gray-500">Plano: {student.planName}</p>
                    </div>

                    {/* Barra de progresso */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">Progresso</span>
                        <span className="text-sm font-bold">{student.percentageComplete}%</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className={`h-2 rounded-full transition-all ${getProgressColor(student.percentageComplete)}`}
                          style={{ width: `${Math.min(student.percentageComplete, 100)}%` }}
                        ></div>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {student.completedHours}h de {student.totalRequiredHours}h
                      </p>
                    </div>

                    {/* Horas pendentes */}
                    <div className="space-y-1">
                      <div className="text-sm font-medium">Pendentes</div>
                      <div className="text-2xl font-bold text-orange-600">
                        {student.pendingHours}h
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {student.lastActivityDate 
                          ? `Última atividade: ${new Date(student.lastActivityDate).toLocaleDateString('pt-BR')}`
                          : 'Sem atividades'
                        }
                      </p>
                    </div>

                    {/* Status e ações */}
                    <div className="flex flex-col items-end justify-between h-full">
                      {getStatusBadge(student.status)}
                      <Button 
                        variant="outline" 
                        size="sm"
                        className="mt-2"
                      >
                        Ver Detalhes
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Resumo */}
      <Card className="bg-blue-50 border-blue-200">
        <CardHeader>
          <CardTitle className="text-base">Resumo de Horas</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <p className="text-muted-foreground">Total de Horas Completadas</p>
              <p className="text-lg font-bold">
                {students.reduce((sum, s) => sum + s.completedHours, 0)}h
              </p>
            </div>
            <div>
              <p className="text-muted-foreground">Total de Horas Pendentes</p>
              <p className="text-lg font-bold text-orange-600">
                {students.reduce((sum, s) => sum + s.pendingHours, 0)}h
              </p>
            </div>
            <div>
              <p className="text-muted-foreground">Progresso Médio</p>
              <p className="text-lg font-bold">
                {Math.round(students.reduce((sum, s) => sum + s.percentageComplete, 0) / students.length || 0)}%
              </p>
            </div>
            <div>
              <p className="text-muted-foreground">Alunos em Atenção</p>
              <p className="text-lg font-bold text-red-600">
                {stats.atRisk + stats.overdue}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
