import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertTriangle, Mail, Phone, Check, Users } from 'lucide-react';

interface StudentHours {
  studentId: string;
  studentName: string;
  studentEmail: string;
  planName: string;
  
  // HORAS DE PRÁTICA (com paciente modelo)
  practiceHoursAvailable: number;
  practiceHoursCompleted: number;
  practiceHoursPending: number;
  
  // HORAS DE OBSERVAÇÃO (observando atendimento clínico)
  observationHoursAvailable: number;
  observationHoursCompleted: number;
  observationHoursPending: number;
  
  // Status geral
  totalPending: number;
  priority: 'urgent' | 'high' | 'medium' | 'low';
}

export default function HorasPraticaObservacaoTab() {
  const [students, setStudents] = useState<StudentHours[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState<'all' | 'practice' | 'observation'>('all');
  const [expandedStudentId, setExpandedStudentId] = useState<string | null>(null);

  useEffect(() => {
    const fetchStudents = async () => {
      try {
        setLoading(true);
        const response = await fetch('/api/admin/student-hours', {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('ampla_token')}`
          }
        });

        if (!response.ok) throw new Error('Falha ao carregar');

        const data = await response.json();
        
        // Filtrar apenas quem tem saldo em alguma coisa
        const studentsWithSaldo = data
          .filter((student: any) => student.practiceHoursPending > 0 || student.observationHoursPending > 0)
          .map((student: any) => ({
            ...student,
            totalPending: student.practiceHoursPending + student.observationHoursPending,
            priority: calculatePriority(student.practiceHoursPending, student.observationHoursPending)
          }))
          .sort((a, b) => b.totalPending - a.totalPending);

        setStudents(studentsWithSaldo);
      } catch (error) {
        console.error('Erro:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchStudents();
    const interval = setInterval(fetchStudents, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  const calculatePriority = (practice: number, observation: number) => {
    const total = practice + observation;
    if (total >= 50) return 'urgent';
    if (total >= 30) return 'high';
    if (total >= 15) return 'medium';
    return 'low';
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'bg-red-50 border-l-4 border-red-600';
      case 'high': return 'bg-orange-50 border-l-4 border-orange-600';
      case 'medium': return 'bg-yellow-50 border-l-4 border-yellow-600';
      case 'low': return 'bg-blue-50 border-l-4 border-blue-600';
      default: return 'bg-gray-50';
    }
  };

  const getPriorityBadge = (priority: string) => {
    const config = {
      urgent: { label: '🔴 URGENTE', color: 'bg-red-600 text-white' },
      high: { label: '🟠 ALTA', color: 'bg-orange-600 text-white' },
      medium: { label: '🟡 MÉDIA', color: 'bg-yellow-600 text-white' },
      low: { label: '🟢 BAIXA', color: 'bg-blue-600 text-white' }
    };
    const config_item = config[priority as keyof typeof config];
    return <Badge className={config_item.color}>{config_item.label}</Badge>;
  };

  const filteredStudents = students.filter(student => {
    if (filterType === 'all') return true;
    if (filterType === 'practice') return student.practiceHoursPending > 0;
    if (filterType === 'observation') return student.observationHoursPending > 0;
    return true;
  });

  const stats = {
    total: students.length,
    withPractice: students.filter(s => s.practiceHoursPending > 0).length,
    withObservation: students.filter(s => s.observationHoursPending > 0).length,
    urgent: students.filter(s => s.priority === 'urgent').length
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (students.length === 0) {
    return (
      <div className="text-center py-12">
        <Check className="w-16 h-16 mx-auto mb-4 text-green-500" />
        <h2 className="text-2xl font-bold text-green-700 mb-2">🎉 Parabéns!</h2>
        <p className="text-gray-600">Nenhum aluno com horas pendentes no momento.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Alertas */}
      {stats.urgent > 0 && (
        <Alert className="bg-red-50 border-red-300">
          <AlertTriangle className="h-4 w-4 text-red-700" />
          <AlertDescription className="text-red-900 font-semibold">
            ⚠️ {stats.urgent} aluno(s) com MUITAS horas pendentes! Agende agora!
          </AlertDescription>
        </Alert>
      )}

      {/* Cards de Resumo */}
      <div className="grid grid-cols-4 gap-4">
        <Card className="bg-white">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-gray-700">Total Alunos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-gray-900">{stats.total}</div>
          </CardContent>
        </Card>
        <Card className="bg-blue-50 border-blue-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-blue-900">💪 Com Prática Pendente</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-blue-700">{stats.withPractice}</div>
          </CardContent>
        </Card>
        <Card className="bg-purple-50 border-purple-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-purple-900">👁️ Com Observação Pendente</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-purple-700">{stats.withObservation}</div>
          </CardContent>
        </Card>
        <Card className="bg-red-50 border-red-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-red-900">🔴 Urgente</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-red-700">{stats.urgent}</div>
          </CardContent>
        </Card>
      </div>

      {/* Filtros */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Filtrar por Tipo</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2">
            <Button 
              variant={filterType === 'all' ? 'default' : 'outline'}
              onClick={() => setFilterType('all')}
            >
              Todos ({students.length})
            </Button>
            <Button 
              variant={filterType === 'practice' ? 'default' : 'outline'}
              onClick={() => setFilterType('practice')}
              className={filterType === 'practice' ? 'bg-blue-600 hover:bg-blue-700' : ''}
            >
              💪 Prática ({stats.withPractice})
            </Button>
            <Button 
              variant={filterType === 'observation' ? 'default' : 'outline'}
              onClick={() => setFilterType('observation')}
              className={filterType === 'observation' ? 'bg-purple-600 hover:bg-purple-700' : ''}
            >
              👁️ Observação ({stats.withObservation})
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Lista de Alunos */}
      <div className="space-y-4">
        {filteredStudents.map((student) => (
          <div
            key={student.studentId}
            className={`rounded-lg p-5 cursor-pointer transition-all hover:shadow-md ${getPriorityColor(student.priority)}`}
            onClick={() => setExpandedStudentId(expandedStudentId === student.studentId ? null : student.studentId)}
          >
            {/* Header */}
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="text-lg font-bold text-gray-900">{student.studentName}</h3>
                <p className="text-sm text-gray-700">{student.studentEmail}</p>
                <p className="text-xs text-gray-600 mt-1">📋 {student.planName}</p>
              </div>
              {getPriorityBadge(student.priority)}
            </div>

            {/* Grid de Horas */}
            <div className="grid grid-cols-2 gap-4 mb-4">
              {/* PRÁTICA */}
              <div className="bg-white bg-opacity-70 rounded-lg p-4 border-l-4 border-blue-600">
                <h4 className="text-sm font-bold text-gray-900 mb-3">💪 HORAS DE PRÁTICA</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-700">Direito a:</span>
                    <span className="font-bold text-gray-900">{student.practiceHoursAvailable}h</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-700">Já realizou:</span>
                    <span className="font-bold text-gray-900">{student.practiceHoursCompleted}h</span>
                  </div>
                  <div className="border-t pt-2 flex justify-between">
                    <span className="font-semibold text-gray-900">⏳ Pendente:</span>
                    <span className="text-lg font-bold text-blue-700">{student.practiceHoursPending}h</span>
                  </div>
                  
                  {student.practiceHoursAvailable > 0 && (
                    <div className="mt-2 w-full bg-gray-300 rounded-full h-2">
                      <div
                        className="h-2 rounded-full bg-blue-600"
                        style={{ 
                          width: `${(student.practiceHoursCompleted / student.practiceHoursAvailable) * 100}%` 
                        }}
                      ></div>
                    </div>
                  )}
                </div>
              </div>

              {/* OBSERVAÇÃO */}
              <div className="bg-white bg-opacity-70 rounded-lg p-4 border-l-4 border-purple-600">
                <h4 className="text-sm font-bold text-gray-900 mb-3">👁️ HORAS DE OBSERVAÇÃO</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-700">Direito a:</span>
                    <span className="font-bold text-gray-900">{student.observationHoursAvailable}h</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-700">Já observou:</span>
                    <span className="font-bold text-gray-900">{student.observationHoursCompleted}h</span>
                  </div>
                  <div className="border-t pt-2 flex justify-between">
                    <span className="font-semibold text-gray-900">⏳ Pendente:</span>
                    <span className="text-lg font-bold text-purple-700">{student.observationHoursPending}h</span>
                  </div>
                  
                  {student.observationHoursAvailable > 0 && (
                    <div className="mt-2 w-full bg-gray-300 rounded-full h-2">
                      <div
                        className="h-2 rounded-full bg-purple-600"
                        style={{ 
                          width: `${(student.observationHoursCompleted / student.observationHoursAvailable) * 100}%` 
                        }}
                      ></div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Botões de ação - sempre visíveis */}
            <div className="flex gap-2 pt-3 border-t">
              <Button 
                size="sm"
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
                onClick={(e) => {
                  e.stopPropagation();
                  window.location.href = `mailto:${student.studentEmail}?subject=Agendamento de Prática e Observação - ${student.studentName}`;
                }}
              >
                <Mail className="w-4 h-4 mr-2" />
                Email
              </Button>
              <Button 
                size="sm"
                className="flex-1 bg-green-600 hover:bg-green-700 text-white"
                onClick={(e) => {
                  e.stopPropagation();
                  const message = `Olá ${student.studentName.split(' ')[0]}! Você tem ${student.practiceHoursPending}h de prática e ${student.observationHoursPending}h de observação pendentes. Vamos agendar? 👨‍⚕️`;
                  window.open(`https://wa.me/?text=${encodeURIComponent(message)}`);
                }}
              >
                <Phone className="w-4 h-4 mr-2" />
                WhatsApp
              </Button>
            </div>

            {/* Expandível - Detalhes */}
            {expandedStudentId === student.studentId && (
              <div className="mt-4 pt-4 border-t space-y-3 bg-white bg-opacity-50 rounded p-3">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div className="bg-blue-100 rounded p-2">
                    <p className="text-blue-900 font-semibold text-center">
                      💪 Total Prática: {student.practiceHoursPending}h
                    </p>
                  </div>
                  <div className="bg-purple-100 rounded p-2">
                    <p className="text-purple-900 font-semibold text-center">
                      👁️ Total Observação: {student.observationHoursPending}h
                    </p>
                  </div>
                </div>
                <p className="text-sm text-gray-700 text-center font-semibold">
                  📊 TOTAL PENDENTE: {student.totalPending}h
                </p>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Info Footer */}
      <Card className="bg-gradient-to-r from-blue-50 to-purple-50 border-blue-200">
        <CardHeader>
          <CardTitle className="text-sm">📚 Sobre as Horas</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-gray-700 space-y-2">
          <p>
            <strong className="text-blue-900">💪 Horas de Prática:</strong> Aluno pratica procedimentos com paciente modelo sob sua supervisão
          </p>
          <p>
            <strong className="text-purple-900">👁️ Horas de Observação:</strong> Aluno observa você realizando atendimento clínico
          </p>
          <p className="text-gray-600 mt-3">
            ⚙️ Lista atualiza a cada 5 minutos automaticamente
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
