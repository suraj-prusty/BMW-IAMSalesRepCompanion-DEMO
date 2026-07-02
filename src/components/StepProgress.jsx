import { useLocation } from 'react-router-dom';
import { CheckCircle, ArrowRight } from 'lucide-react';

const steps = [
  { label: 'Dealer Briefing', path: '/dealer' },
  { label: 'Visit Capture', path: '/visit' },
  { label: 'Review & Submit', path: '/submit' },
];

export default function StepProgress() {
  const { pathname } = useLocation();

  const getStepState = (step, index) => {
    const currentIdx = steps.findIndex((s) => pathname.startsWith(s.path));
    if (index < currentIdx) return 'completed';
    if (index === currentIdx) return 'active';
    return 'inactive';
  };

  return (
    <div
      style={{
        background: '#141414',
        borderBottom: '1px solid #2A2A2A',
        padding: '12px 24px',
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
      }}
    >
      {steps.map((step, index) => {
        const state = getStepState(step, index);
        return (
          <div key={step.label} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                paddingBottom: state === 'active' ? '2px' : '0',
                borderBottom: state === 'active' ? '2px solid #A100FF' : 'none',
              }}
            >
              {state === 'completed' && (
                <CheckCircle size={14} color="#A100FF" />
              )}
              <span
                style={{
                  fontSize: '13px',
                  fontWeight: state === 'active' ? '700' : '400',
                  color:
                    state === 'active'
                      ? '#FFFFFF'
                      : state === 'completed'
                      ? '#A100FF'
                      : '#A0A0A0',
                }}
              >
                {step.label}
              </span>
            </div>
            {index < steps.length - 1 && (
              <ArrowRight size={14} color="#2A2A2A" />
            )}
          </div>
        );
      })}
    </div>
  );
}
