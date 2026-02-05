import React, { useState } from 'react';
import { format } from 'date-fns';
import { CalendarIcon, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Input } from '@/components/ui/input';

interface DateTimePickerProps {
  value: Date | undefined;
  onChange: (date: Date | undefined) => void;
}

const DateTimePicker: React.FC<DateTimePickerProps> = ({ value, onChange }) => {
  const [step, setStep] = useState<'date' | 'time'>('date');
  const [open, setOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(value);
  const [selectedHour, setSelectedHour] = useState<string>(value ? format(value, 'HH') : '09');
  const [selectedMinute, setSelectedMinute] = useState<string>(value ? format(value, 'mm') : '00');

  const handleDateSelect = (date: Date | undefined) => {
    setSelectedDate(date);
    if (date) {
      setStep('time');
    }
  };

  const handleHourChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.replace(/\D/g, '').slice(0, 2);
    const num = parseInt(val) || 0;
    if (num >= 0 && num <= 23) {
      setSelectedHour(val);
    } else if (val === '') {
      setSelectedHour('');
    }
  };

  const handleMinuteChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.replace(/\D/g, '').slice(0, 2);
    const num = parseInt(val) || 0;
    if (num >= 0 && num <= 59) {
      setSelectedMinute(val);
    } else if (val === '') {
      setSelectedMinute('');
    }
  };

  const handleConfirmTime = () => {
    if (selectedDate) {
      const newDate = new Date(selectedDate);
      const hour = selectedHour ? parseInt(selectedHour) : 0;
      const minute = selectedMinute ? parseInt(selectedMinute) : 0;
      newDate.setHours(hour, minute);
      onChange(newDate);
    }
    setOpen(false);
    setStep('date');
  };

  const handleOpenChange = (isOpen: boolean) => {
    setOpen(isOpen);
    if (!isOpen) {
      setStep('date');
    }
  };

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={cn(
            "w-full justify-start text-left font-normal min-h-[44px]",
            !value && "text-muted-foreground"
          )}
        >
          <CalendarIcon className="mr-2 h-4 w-4" />
          {value ? format(value, "PPP 'at' p") : <span>Pick date & time</span>}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        {step === 'date' ? (
          <div className="p-0">
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={handleDateSelect}
              initialFocus
              className={cn("p-3 pointer-events-auto")}
              disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))}
            />
          </div>
        ) : (
          <div className="p-4 space-y-4">
            <div className="flex items-center gap-2 text-sm font-medium">
              <Clock className="h-4 w-4" />
              <span>Enter Time</span>
            </div>
            
            <div className="flex items-center gap-2 justify-center">
              <Input
                type="text"
                inputMode="numeric"
                value={selectedHour}
                onChange={handleHourChange}
                placeholder="HH"
                className="w-[70px] text-center text-lg font-bold min-h-[44px]"
                maxLength={2}
              />
              
              <span className="text-lg font-bold">:</span>
              
              <Input
                type="text"
                inputMode="numeric"
                value={selectedMinute}
                onChange={handleMinuteChange}
                placeholder="MM"
                className="w-[70px] text-center text-lg font-bold min-h-[44px]"
                maxLength={2}
              />
            </div>

            <p className="text-xs text-center text-muted-foreground">24-hour format (00-23 : 00-59)</p>

            <div className="text-sm text-muted-foreground text-center">
              {selectedDate && (
                <span>
                  {format(selectedDate, 'EEEE, MMMM d, yyyy')} at {selectedHour || '00'}:{selectedMinute || '00'}
                </span>
              )}
            </div>

            <div className="flex gap-2">
              <Button 
                variant="outline" 
                onClick={() => setStep('date')} 
                className="flex-1 min-h-[44px]"
              >
                Back
              </Button>
              <Button 
                onClick={handleConfirmTime} 
                className="flex-1 min-h-[44px]"
              >
                Confirm
              </Button>
            </div>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
};

export default DateTimePicker;
