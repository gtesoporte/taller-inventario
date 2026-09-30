// fuente: 'camara' | 'galeria'
// En móvil 'camara' abre la cámara trasera; en escritorio abre explorador de archivos.
const esMobil = () => typeof navigator !== 'undefined' && /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);

export const seleccionarFoto = (onFoto, fuente = 'galeria') => {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = 'image/*';
  if (fuente === 'camara' && esMobil()) input.capture = 'environment';
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
        // 700px/0.6 en vez de 1000px/0.78: las fotos se guardan incrustadas en el
        // documento de Firestore (no en Storage), así que cada lista que las lee
        // descarga y decodifica esto aunque solo muestre una miniatura de 50-60px.
        // Este tamaño reduce el peso ~60% sin perder nitidez notoria en pantalla.
        const MAX = 700;
        const ratio = Math.min(MAX / img.width, MAX / img.height, 1);
        const canvas = document.createElement('canvas');
        canvas.width = Math.round(img.width * ratio);
        canvas.height = Math.round(img.height * ratio);
        canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
        onFoto(canvas.toDataURL('image/jpeg', 0.6));
      };
      img.src = ev.target.result;
    };
    reader.readAsDataURL(file);
  };

  // Adjuntar al DOM antes de disparar — necesario en navegadores de escritorio
  document.body.appendChild(input);
  input.click();
};
