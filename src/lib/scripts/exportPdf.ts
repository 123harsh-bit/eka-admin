// Client-side PDF export using html2pdf.js
// Dynamically imported so the heavy PDF bundle only loads on demand.
export async function exportEditorToPdf(element: HTMLElement, filename: string) {
  const mod = await import('html2pdf.js');
  const html2pdf = (mod as unknown as { default: (arg?: unknown) => unknown }).default;
  const opts = {
    margin: [10, 12, 10, 12],
    filename: filename.endsWith('.pdf') ? filename : `${filename}.pdf`,
    image: { type: 'jpeg', quality: 0.95 },
    html2canvas: { scale: 2, useCORS: true, backgroundColor: '#ffffff' },
    jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
    pagebreak: { mode: ['css', 'legacy'] },
  };

  // Clone into a light-themed container so exported PDF is readable on white.
  const wrapper = document.createElement('div');
  wrapper.style.background = '#ffffff';
  wrapper.style.color = '#111111';
  wrapper.style.padding = '24px';
  wrapper.style.fontFamily = 'Inter, system-ui, sans-serif';
  wrapper.style.fontSize = '14px';
  wrapper.style.lineHeight = '1.6';
  wrapper.innerHTML = element.innerHTML;
  // Force text/link colors to black for legibility on white
  wrapper.querySelectorAll('*').forEach((n) => {
    (n as HTMLElement).style.color = '#111111';
    (n as HTMLElement).style.background = 'transparent';
  });
  document.body.appendChild(wrapper);
  try {
    // @ts-expect-error html2pdf fluent API
    await html2pdf().set(opts).from(wrapper).save();
  } finally {
    wrapper.remove();
  }
}
