// fuente: 'camara' | 'galeria'
// En móvil 'camara' abre la cámara trasera directamente.
// En escritorio ambas fuentes abren el explorador de archivos.
export const seleccionarFoto = (onFoto, fuente = 'galeria') => {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = 'image/*';
  if (fuente === 'camara') input.capture = 'environment';
  input.style.position = 'fixed';
  input.style.opacity = '0';
  input.style.pointerEvents = 'none';

  const limpiar = () => {
    try { document.body.removeChild(input); } catch {}
  };

  input.onchange = (e) => {
    const file = e.target.files[0];
    limpiar();
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const img = new window.Image();
      img.onload = () => {
        const MAX = 1000;
        const ratio = Math.min(MAX / img.width, MAX / img.height, 1);
        const canvas = document.createElement('canvas');
        canvas.width = Math.round(img.width * ratio);
        canvas.height = Math.round(img.height * ratio);
        canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
        onFoto(canvas.toDataURL('image/jpeg', 0.78));
      };
      img.src = ev.target.result;
    };
    reader.readAsDataURL(file);
  };

  // Adjuntar al DOM antes de disparar — necesario en navegadores de escritorio
  document.body.appendChild(input);
  input.click();
};
