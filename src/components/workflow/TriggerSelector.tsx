'use client';

import { Card, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { WorkflowTrigger } from '@/types/workflow';

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
        config = { schedule: '0 0 * * *', timezone: 'UTC' };
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
                value={(trigger.config as any).url || ''}
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
                value={(trigger.config as any).method || 'POST'}
                onValueChange={(value) => onTriggerChange({
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
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="cron-schedule">Расписание (cron)</Label>
              <Input
                id="cron-schedule"
                value={(trigger.config as any).schedule || ''}
                onChange={(e) => onTriggerChange({
                  ...trigger,
                  config: { ...trigger.config, schedule: e.target.value }
                })}
                placeholder="0 0 * * *"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Формат: * * * * * (мин час день месяц день_недели)
              </p>
            </div>
            <div>
              <Label htmlFor="cron-timezone">Часовой пояс</Label>
              <Input
                id="cron-timezone"
                value={(trigger.config as any).timezone || 'UTC'}
                onChange={(e) => onTriggerChange({
                  ...trigger,
                  config: { ...trigger.config, timezone: e.target.value }
                })}
                placeholder="UTC"
              />
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
                  value={(trigger.config as any).from || ''}
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
                  value={(trigger.config as any).subject || ''}
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
                value={(trigger.config as any).body || ''}
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
