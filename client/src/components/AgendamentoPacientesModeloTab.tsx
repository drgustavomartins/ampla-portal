import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertTriangle, Mail, Phone, Check, Clock, TrendingDown } from 'lucide-react';

interface StudentToSchedule {
  studentId: string;
  studentName: string;
  studentEmail: string;
  studentPhone?: string;
  planName: string;
  completedHours: number;
  pendingHours: number;
  percentageComplete: number;
  priority: 'urgent' | 'high' | 'medium' | 'low';
  lastActivityDate?: string;
}

export default function AgendamentoPacientesModeloTab() {
  const [studentsToSchedule, setStudentsToSchedule] = useState<StudentToSchedule[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'urgent' | 'high' | 'medium'>('all');
  const [expandedStudentId, setExpandedStudentId] = useState<string | null>(null);
  const [contactMethod, setContactMethod] = useState<string | null>(null);

  useEffect(() => {
    const fetchStudentsToSchedule = async () => {
      try {
        setLoading(true);
        const response = await fetch('/api/admin/practice-hours', {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('ampla_token')}`
          }
        });

        if (!response.ok) throw new Error('Falha ao carregar');

        const allStudents = await response.json();
        
        // Filtrar apenas quem tem horas pendentes (> 0)
        const studentsWithPendingHours = allStudents
          .filter((student: any) => student.pendingHours > 0)
          .map((student: any) => ({
            studentId: student.studentId,
            studentName: student.studentName,
            studentEmail: student.studentEmail,
            planName: student.planName,
            completedHours: student.completedHours,
            pendingHours: student.pendingHours,
            percentageComplete: student.percentageComplete,
            lastActivityDate: student.lastActivityDate,
            priority: calculatePriority(student.pendingHours, student.percentageComplete)
          }))
          .sort((a, b) => {
            // Ordenar por prioridade
            const priorityOrder = { urgent: 0, high: 1, medium: 2, low: 3 };
            const priorityDiff = priorityOrder[a.priority] - priorityOrder[b.priority];
            if (priorityDiff !== 0) return priorityDiff;
            // Se mesma prioridade, ordenar por horas pendentes (maior para menor)
            return b.pendingHours - a.pendingHours;
          });

        setStudentsToSchedule(studentsWithPendingHours);
      } catch (error) {
        console.error('Erro ao carregar alunos para agendamento:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchStudentsToSchedule();
    // Atualizar a cada 5 minutos
    const interval = setInterval(fetchStudentsToSchedule, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  const calculatePriority = (pendingHours: number, percentageComplete: number): 'urgent' | 'high' | 'medium' | 'low' => {
    if (pendingHours >= 40) return 'urgent';
    if (pendingHours >= 20) return 'high';
    if (pendingHours >= 10) return 'medium';
    return 'low';
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'bg-red-50 border-l-4 border-red-500';
      case 'high': return 'bg-orange-50 border-l-4 border-orange-500';
      case 'medium': return 'bg-yellow-50 border-l-4 border-yellow-500';
      case 'low': return 'bg-blue-50 border-l-4 border-blue-500';
      default: return 'bg-gray-50';
    }
  };

  const getPriorityBadge = (priority: string) => {
    const config = {
      urgent: { label: '🔴 URGENTE', color: 'bg-red-100 text-red-800' },
      high: { label: '🟠 ALTA', color: 'bg-orange-100 text-orange-800' },
      medium: { label: '🟡 MÉDIA', color: 'bg-yellow-100 text-yellow-800' },
      low: { label: '🟢 BAIXA', color: 'bg-blue-100 text-blue-800' }
    };
    const config_item = config[priority as keyof typeof config];
    return <Badge className={config_item.color}>{config_item.label}</Badge>;
  };

  const calculateSessionsNeeded = (hours: number) => {
    return Math.ceil(hours / 10);
  };

  const handleContactStudent = (method: 'email' | 'whatsapp', student: StudentToSchedule) => {
    if (method === 'email') {
      window.location.href = `mailto:${student.studentEmail}?subject=Agendamento de Pacientes Modelo - Prática Supervisionada&body=Olá ${student.studentName.split(' ')[0]},\n\nVi que você ainda tem ${student.pendingHours} horas de prática supervisionada pendentes.\n\nGostaria de agendar ${calculateSessionsNeeded(student.pendingHours)} encontro(s) de ~10 horas cada para completar sua formação.\n\nQual sua disponibilidade?\n\nAbraço,\nDr. Gustavo`;
    } else if (method === 'whatsapp' && student.studentPhone) {
      const message = `Olá ${student.studentName.split(' ')[0]}! Você tem ${student.pendingHours}h de prática supervisionada pendentes. Vamos agendar ${calculateSessionsNeeded(student.pendingHours)} pacientes modelo? 👨‍⚕️`;
      window.open(`https://wa.me/${student.studentPhone.replace(/\D/g, '')}?text=${encodeURIComponent(message)}`);
    }
  };

  const filteredStudents = filter === 'all' 
    ? studentsToSchedule 
    : studentsToSchedule.filter(s => s.priority === filter);

  const stats = {
    total: studentsToSchedule.length,
    urgent: studentsToSchedule.filter(s => s.priority === 'urgent').length,
    high: studentsToSchedule.filter(s => s.priority === 'high').length,
    totalPending: studentsToSchedule.reduce((sum, s) => sum + s.pendingHours, 0)
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (studentsToSchedule.length === 0) {
    return (
      <div className="text-center py-12">
        <Check className="w-16 h-16 mx-auto mb-4 text-green-500" />
        <h2 className="text-2xl font-bold text-green-700 mb-2">🎉 Parabéns!</h2>
        <p className="text-gray-600">
          Nenhum aluno com horas de prática pendentes no momento.
        </p>
        <p className="text-sm text-gray-500 mt-2">
          Todos estão em dia com suas práticas supervisionadas!
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Alerta de Ação */}
      {stats.urgent > 0 && (
        <Alert className="bg-red-50 border-red-200">
          <AlertTriangle className="h-4 w-4 text-red-600" />
          <AlertDescription className="text-red-800">
            <strong>⚠️ {stats.urgent} aluno(s) PRECISA(M) de agendamento URGENTE!</strong> 
            {stats.urgent === 1 ? ' Com 40+ horas pendentes.' : ' Com 40+ horas pendentes cada.'}
          </AlertDescription>
        </Alert>
      )}

      {/* Cards de Resumo */}
      <div className="grid grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Total de Alunos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">🔴 Urgente</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{stats.urgent}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">🟠 Alta</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{stats.high}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Total Pendente</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalPending}h</div>
          </CardContent>
        </Card>
      </div>

      {/* Filtros */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Filtrar por Prioridade</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2 flex-wrap">
            <Button 
              variant={filter === 'all' ? 'default' : 'outline'}
              onClick={() => setFilter('all')}
              size="sm"
            >
              Todos ({stats.total})
            </Button>
            <Button 
              variant={filter === 'urgent' ? 'default' : 'outline'}
              onClick={() => setFilter('urgent')}
              size="sm"
              className={filter === 'urgent' ? 'bg-red-600 hover:bg-red-700' : ''}
            >
              🔴 Urgente ({stats.urgent})
            </Button>
            <Button 
              variant={filter === 'high' ? 'default' : 'outline'}
              onClick={() => setFilter('high')}
              size="sm"
              className={filter === 'high' ? 'bg-orange-600 hover:bg-orange-700' : ''}
            >
              🟠 Alta ({stats.high})
            </Button>
            <Button 
              variant={filter === 'medium' ? 'default' : 'outline'}
              onClick={() => setFilter('medium')}
              size="sm"
            >
              🟡 Média
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Lista de Alunos para Agendar */}
      <div className="space-y-3">
        {filteredStudents.map((student) => (
          <div 
            key={student.studentId} 
            className={`rounded-lg p-4 cursor-pointer transition-all ${getPriorityColor(student.priority)}`}
            onClick={() => setExpandedStudentId(expandedStudentId === student.studentId ? null : student.studentId)}
          >
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <h3 className="font-bold text-lg">{student.studentName}</h3>
                  {getPriorityBadge(student.priority)}
                </div>
                
                <div className="grid grid-cols-4 gap-4 text-sm mb-2">
                  <div>
                    <p className="text-gray-600">Email</p>
                    <p className="font-mono text-xs">{student.studentEmail}</p>
                  </div>
                  <div>
                    <p className="text-gray-600">Progresso</p>
                    <p className="font-bold">{student.percentageComplete}% ({student.completedHours}h de 60h)</p>
                  </div>
                  <div>
                    <p className="text-gray-600">⏳ Pendentes</p>
                    <p className="text-2xl font-bold">{student.pendingHours}h</p>
                  </div>
                  <div>
                    <p className="text-gray-600">Sessões Necessárias</p>
                    <p className="text-xl font-bold">{calculateSessionsNeeded(student.pendingHours)}x 10h</p>
                  </div>
                </div>

                {/* Barra de progresso */}
                <div className="w-full bg-gray-300 rounded-full h-2 mb-2">
                  <div
                    className="h-2 rounded-full bg-blue-500 transition-all"
                    style={{ width: `${student.percentageComplete}%` }}
                  ></div>
                </div>
              </div>

              {/* Botões de ação */}
              <div className="flex gap-2 ml-4">
                <Button 
                  variant="outline" 
                  size="sm"
                  title="Enviar email"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleContactStudent('email', student);
                  }}
                >
                  <Mail className="w-4 h-4" />
                </Button>
                {student.studentPhone && (
                  <Button 
                    variant="outline" 
                    size="sm"
                    title="Enviar WhatsApp"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleContactStudent('whatsapp', student);
                    }}
                  >
                    <Phone className="w-4 h-4" />
                  </Button>
                )}
              </div>
            </div>

            {/* Expandido */}
            {expandedStudentId === student.studentId && (
              <div className="mt-4 pt-4 border-t border-gray-300 space-y-3">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-gray-600">Plano</p>
                    <p className="font-semibold">{student.planName}</p>
                  </div>
                  <div>
                    <p className="text-gray-600">Última atividade</p>
                    <p className="font-semibold">
                      {student.lastActivityDate 
                        ? new Date(student.lastActivityDate).toLocaleDateString('pt-BR')
                        : 'Sem registros'}
                    </p>
                  </div>
                </div>

                <div className="bg-white bg-opacity-50 rounded p-3">
                  <p className="text-xs text-gray-600 mb-2">📅 Sugestão de Agendamento:</p>
                  <p className="text-sm font-semibold">
                    {calculateSessionsNeeded(student.pendingHours)} encontro(s) de 10 horas cada
                    {student.pendingHours % 10 !== 0 && ` + 1 encontro de ${student.pendingHours % 10}h`}
                  </p>
                </div>

                <div className="flex gap-2">
                  <Button 
                    size="sm"
                    className="flex-1"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleContactStudent('email', student);
                    }}
                  >
                    <Mail className="w-4 h-4 mr-2" />
                    Contatar via Email
                  </Button>
                  {student.studentPhone && (
                    <Button 
                      size="sm"
                      className="flex-1"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleContactStudent('whatsapp', student);
                      }}
                    >
                      <Phone className="w-4 h-4 mr-2" />
                      Contatar via WhatsApp
                    </Button>
                  )}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Info rodapé */}
      <Card className="bg-blue-50">
        <CardHeader>
          <CardTitle className="text-sm">💡 Como usar</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-gray-700">
          <ul className="list-disc list-inside space-y-1">
            <li>Esta lista <strong>atualiza automaticamente</strong> a cada 5 minutos</li>
            <li>Quando um aluno completar suas horas, ele <strong>desaparece da lista</strong></li>
            <li>Quando um novo aluno tiver horas pendentes, ele <strong>aparece automaticamente</strong></li>
            <li>Clique no aluno para expandir e ver detalhes</li>
            <li>Use os botões de email/WhatsApp para contatar rapidamente</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
