'use client';

import { Card, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { WorkflowTrigger, WebhookTriggerConfig, CronTriggerConfig, EmailTriggerConfig } from '@/types/workflow';

interface TriggerSelectorProps {
  trigger: WorkflowTrigger;
  onTriggerChange: (trigger: WorkflowTrigger) => void;
}


export function TriggerSelector({ trigger, onTriggerChange }: TriggerSelectorProps) {
  const handleTypeChange = (type: 'webhook' | 'cron' | 'email') => {
    let config = {};

    switch (type) {
      case 'webhook':
        config = { url: '', method: 'POST', headers: {} };
        break;
      case 'cron':
        config = { schedule: '1', timezone: 'Europe/Moscow' }; // По умолчанию каждую минуту
        break;
      case 'email':
        config = { from: '', subject: '', body: '' };
        break;
    }

    onTriggerChange({
      id: `trigger_${Date.now()}`,
      type,
      config
    });
  };

  const renderTriggerConfig = () => {
    switch (trigger.type) {
      case 'webhook':
        return (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="webhook-url" className="mb-3 block">URL</Label>
              <Input
                id="webhook-url"
                value={(trigger.config as WebhookTriggerConfig).url || ''}
                onChange={(e) => onTriggerChange({
                  ...trigger,
                  config: { ...trigger.config, url: e.target.value }
                })}
                placeholder="https://your-api.com/webhook"
              />
            </div>
            <div>
              <Label htmlFor="webhook-method" className="mb-3 block">Метод</Label>
              <Select
                value={(trigger.config as WebhookTriggerConfig).method || 'POST'}
                onValueChange={(value: WebhookTriggerConfig['method']) => onTriggerChange({
                  ...trigger,
                  config: { ...trigger.config, method: value }
                })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="GET">GET</SelectItem>
                  <SelectItem value="POST">POST</SelectItem>
                  <SelectItem value="PUT">PUT</SelectItem>
                  <SelectItem value="PATCH">PATCH</SelectItem>
                  <SelectItem value="DELETE">DELETE</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        );

      case 'cron':
        return (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="cron-schedule">Расписание (cron)</Label>
              <Input
                id="cron-schedule"
                value={(trigger.config as CronTriggerConfig).schedule || '1'}
                onChange={(e) => onTriggerChange({
                  ...trigger,
                  config: { ...trigger.config, schedule: e.target.value }
                })}
                placeholder="* * * * *"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Cron выражение или простой формат (1, 11, 111, 1111)
              </p>
            </div>
            <div>
              <Label htmlFor="cron-timezone">Часовой пояс</Label>
              <Input
                id="cron-timezone"
                value="Europe/Moscow (MSK)"
                disabled
                className="bg-gray-50"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Московское время (UTC+3)
              </p>
            </div>
          </div>
            <div className="p-3 bg-green-50 border border-green-200 rounded-md">
              <p className="text-sm text-green-800">
                <strong>✅ Cron активен:</strong> Workflow будет автоматически запускаться по расписанию.
              </p>
            </div>
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-md">
              <p className="text-sm text-blue-800">
                <strong>📝 Формат расписаний:</strong><br/>
                <strong>Простой формат:</strong><br/>
                <code>1</code> - каждую минуту ⚠️<br/>
                <code>11</code> - каждый час<br/>
                <code>111</code> - каждый день в полночь<br/>
                <code>1111</code> - каждый понедельник<br/>
                <br/>
                <strong>Полный cron формат:</strong><br/>
                <code>* * * * *</code> - каждую минуту<br/>
                <code>*/5 * * * *</code> - каждые 5 минут<br/>
                <code>0 * * * *</code> - каждый час<br/>
                <code>0 9 * * 1-5</code> - будни в 9:00
              </p>
              {((trigger.config as CronTriggerConfig).schedule === '1' || (trigger.config as CronTriggerConfig).schedule === '* * * * *') && (
                <p className="text-xs text-red-600 mt-2 font-medium">
                  ⚠️ Внимание: Это расписание запускает workflow каждую минуту! Используйте только для тестирования.
                </p>
              )}
            </div>
          </div>
        );

      case 'email':
        return (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="email-from">От кого</Label>
                <Input
                  id="email-from"
                  value={(trigger.config as EmailTriggerConfig).from || ''}
                  onChange={(e) => onTriggerChange({
                    ...trigger,
                    config: { ...trigger.config, from: e.target.value }
                  })}
                  placeholder="trigger@yourdomain.com"
                />
              </div>
              <div>
                <Label htmlFor="email-subject">Тема</Label>
                <Input
                  id="email-subject"
                  value={(trigger.config as EmailTriggerConfig).subject || ''}
                  onChange={(e) => onTriggerChange({
                    ...trigger,
                    config: { ...trigger.config, subject: e.target.value }
                  })}
                  placeholder="Тема триггерного письма"
                />
              </div>
            </div>
            <div>
              <Label htmlFor="email-body">Текст письма</Label>
              <Input
                id="email-body"
                value={(trigger.config as EmailTriggerConfig).body || ''}
                onChange={(e) => onTriggerChange({
                  ...trigger,
                  config: { ...trigger.config, body: e.target.value }
                })}
                placeholder="Ключевые слова или шаблон для активации"
              />
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <Card>
      <CardContent className="p-4">
        <div className="space-y-4">
          <div>
            <Label htmlFor="trigger-type" className="mb-3 block">Тип триггера</Label>
            <Select
              value={trigger.type}
              onValueChange={handleTypeChange}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="webhook">Webhook</SelectItem>
                <SelectItem value="cron">Расписание (Cron)</SelectItem>
                <SelectItem value="email">Email</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {renderTriggerConfig()}
        </div>
      </CardContent>
    </Card>
  );
}
