export function StepHeader({ step, total, title }: { step: number; total: number; title: string }) {
  return (
    <header style={{ padding: '28px 24px 8px' }}>
      <div style={{ width: 'min(100%, 560px)', margin: '0 auto' }}>
        <p style={{ margin: '0 0 8px', color: '#4A7C59', fontSize: 13, fontWeight: 700 }}>
          {step} / {total}
        </p>
        <h1 style={{ margin: 0, fontSize: 24 }}>{title}</h1>
      </div>
    </header>
  );
}
