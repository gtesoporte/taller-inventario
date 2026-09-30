import React, { useEffect, useState } from 'react';
import { View, TouchableOpacity, StyleSheet, ScrollView, ActivityIndicator, Platform } from 'react-native';
import { ArrowLeft, BarChart3, Download } from 'lucide-react-native';
import Text from '../components/UpperText';
import {
  getEstadisticas, CAJUELAS_LISTA, RAZONES_CAJUELA, CLASIFICACIONES_SALIDA_EQUIPO,
} from '../config/firestore';
import { useAuth } from '../context/AuthContext';
import { esAdmin } from '../utils/permisos';

const nombreCajuela = (id) => CAJUELAS_LISTA.find(c => c.id === id)?.nombre || id || 'Sin cajuela';
const razonLabel = (id) => RAZONES_CAJUELA.find(r => r.id === id)?.label || id || 'Sin razón';
const salidaLabel = (id) => CLASIFICACIONES_SALIDA_EQUIPO.find(c => c.id === id)?.label || id;

function agrupar(lista, campo, valorFn = () => 1) {
  const mapa = {};
  lista.forEach(item => {
    const clave = item[campo] || 'Sin especificar';
    mapa[clave] = (mapa[clave] || 0) + valorFn(item);
  });
  return Object.entries(mapa).sort((a, b) => b[1] - a[1]);
}

function calcularEstadisticas(data) {
  const {
    partes, movimientos, equipos, equipoMovimientos,
    cajuelaInventario, cajuelaMovimientos, cajuelaRetiros,
    ubicaciones, contactos, usuarios,
    galeriaCategorias, galeriaSubcategorias, galeriaImagenes,
  } = data;

  const existenciaDe = (p) => Number(p.existencia ?? p.existenciaActual ?? p.cantidad ?? 0) || 0;

  const refacciones = {
    total: partes.length,
    totalPiezas: partes.reduce((s, p) => s + existenciaDe(p), 0),
    sinStock: partes.filter(p => existenciaDe(p) <= 0).length,
    revisadas: partes.filter(p => p.estadoRevision === 'revisada').length,
    pendientes: partes.filter(p => p.estadoRevision !== 'revisada').length,
    porFabricante: agrupar(partes.map(p => ({ fabricante: (p.fabricante || 'Sin fabricante').toUpperCase() })), 'fabricante').slice(0, 8),
    porUbicacion: agrupar(partes.map(p => ({ ubicacion: p.ubicacion || 'Sin ubicación' })), 'ubicacion').slice(0, 8),
  };

  const entradasMov = movimientos.filter(m => (m.tipo || '').toLowerCase() === 'entrada');
  const salidasMov = movimientos.filter(m => (m.tipo || '').toLowerCase() === 'salida');
  const movimientosStats = {
    total: movimientos.length,
    entradas: entradasMov.length,
    salidas: salidasMov.length,
    piezasEntradas: entradasMov.reduce((s, m) => s + (Number(m.cantidad) || 0), 0),
    piezasSalidas: salidasMov.reduce((s, m) => s + (Number(m.cantidad) || 0), 0),
    topRefacciones: agrupar(
      movimientos.map(m => ({ nombre: m.nombreParte || m.nombre || 'Sin nombre' })),
      'nombre'
    ).slice(0, 8),
    topUsuarios: agrupar(
      movimientos.map(m => ({ usuario: m.usuario || 'Sin usuario' })),
      'usuario'
    ).slice(0, 8),
  };

  const equiposStats = {
    total: equipos.length,
    revisados: equipos.filter(e => e.estadoRevision === 'revisada').length,
    pendientes: equipos.filter(e => e.estadoRevision !== 'revisada').length,
    porClasificacion: agrupar(
      equipos.map(e => ({ clasificacion: e.clasificacion ? e.clasificacion.toUpperCase() : 'SIN CLASIFICAR' })),
      'clasificacion'
    ),
    conSalida: equipos.filter(e => !!e.estadoSalida).length,
    activos: equipos.filter(e => !e.estadoSalida).length,
    porSalida: agrupar(
      equipos.filter(e => e.estadoSalida).map(e => ({ salida: salidaLabel(e.estadoSalida) })),
      'salida'
    ),
    movimientosTotal: equipoMovimientos.length,
  };

  const salidasCajuela = cajuelaMovimientos.filter(m => m.tipo === 'salida');
  const cajuelasStats = {
    totalPiezas: cajuelaInventario.reduce((s, i) => s + (Number(i.cantidad) || 0), 0),
    porCajuela: agrupar(
      cajuelaInventario.map(i => ({ cajuela: nombreCajuela(i.cajuelaId), cantidad: Number(i.cantidad) || 0 })),
      'cajuela',
      item => item.cantidad
    ),
    movimientosTotal: cajuelaMovimientos.length,
    entradas: cajuelaMovimientos.filter(m => m.tipo === 'entrada').length,
    salidas: salidasCajuela.length,
    topRazones: agrupar(salidasCajuela.map(m => ({ razon: razonLabel(m.razon) })), 'razon'),
    retirosTotal: cajuelaRetiros.length,
    retirosActivos: cajuelaRetiros.filter(r => r.estado === 'activo').length,
  };

  const usuariosStats = {
    total: usuarios.length,
    porRol: agrupar(usuarios.map(u => ({ rol: u.rol || 'Sin rol' })), 'rol'),
  };

  return {
    refacciones,
    movimientos: movimientosStats,
    equipos: equiposStats,
    cajuelas: cajuelasStats,
    ubicaciones: { total: ubicaciones.length },
    contactos: { total: contactos.length },
    usuarios: usuariosStats,
    galeria: {
      categorias: galeriaCategorias.length,
      subcategorias: galeriaSubcategorias.length,
      imagenes: galeriaImagenes.length,
    },
  };
}

function Tarjeta({ numero, label }) {
  return (
    <View style={styles.tarjeta}>
      <Text style={styles.tarjetaNum}>{numero}</Text>
      <Text style={styles.tarjetaLabel}>{label}</Text>
    </View>
  );
}

function TablaRanking({ filas, total }) {
  if (filas.length === 0) return <Text style={styles.sinDatos}>Sin datos.</Text>;
  return (
    <View style={styles.tabla}>
      {filas.map(([nombre, valor]) => (
        <View key={nombre} style={styles.tablaFila}>
          <Text style={styles.tablaNombre} numberOfLines={1}>{nombre}</Text>
          <Text style={styles.tablaValor}>{valor}{total ? ` (${Math.round((valor / total) * 100)}%)` : ''}</Text>
        </View>
      ))}
    </View>
  );
}

function buildReporteHTML(stats, generadoEn) {
  const seccion = (titulo, filas, total) => `
    <h3>${titulo}</h3>
    ${filas.length === 0 ? '<p class="vacio">Sin datos.</p>' : `
    <table>
      ${filas.map(([nombre, valor]) => `
        <tr>
          <td>${nombre}</td>
          <td class="num">${valor}${total ? ` (${Math.round((valor / total) * 100)}%)` : ''}</td>
        </tr>
      `).join('')}
    </table>`}
  `;

  return `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Estadísticas - Taller Soporte</title>
  <style>
    @page { margin: 20mm 16mm; }
    * { box-sizing: border-box; }
    body { font-family: Arial, Helvetica, sans-serif; color: #1a1a2e; }
    h1 { color: #085686; font-size: 22pt; margin-bottom: 2pt; }
    .subtitulo { color: #555; font-size: 12pt; margin-top: 0; }
    .meta { color: #999; font-size: 9pt; margin-bottom: 20pt; }
    h2 { color: #085686; font-size: 14pt; border-bottom: 2px solid #085686; padding-bottom: 4pt; margin-top: 22pt; page-break-after: avoid; }
    h3 { color: #0B2447; font-size: 11pt; margin-top: 12pt; margin-bottom: 4pt; page-break-after: avoid; }
    .grid { display: flex; flex-wrap: wrap; gap: 8pt; margin: 8pt 0 4pt 0; }
    .card { background: #EEF2F7; border-radius: 8pt; padding: 10pt 14pt; min-width: 110pt; }
    .card .num { font-size: 20pt; font-weight: 800; color: #085686; display: block; }
    .card .lbl { font-size: 8.5pt; color: #555; }
    table { border-collapse: collapse; width: 100%; font-size: 10pt; margin-bottom: 6pt; }
    td { padding: 4pt 8pt; border-bottom: 1px solid #e5e5e5; }
    td.num { text-align: right; font-weight: 700; color: #085686; white-space: nowrap; }
    .vacio { color: #aaa; font-style: italic; font-size: 10pt; }
    .footer { color: #aaa; font-size: 8pt; margin-top: 24pt; border-top: 1px solid #eee; padding-top: 8pt; }
  </style></head><body>
    <h1>Taller Soporte</h1>
    <p class="subtitulo">Reporte de estadísticas</p>
    <p class="meta">Diagnóstica Internacional · Generado el ${generadoEn}</p>

    <h2>Refacciones</h2>
    <div class="grid">
      <div class="card"><span class="num">${stats.refacciones.total}</span><span class="lbl">REFACCIONES REGISTRADAS</span></div>
      <div class="card"><span class="num">${stats.refacciones.totalPiezas}</span><span class="lbl">PIEZAS EN EXISTENCIA</span></div>
      <div class="card"><span class="num">${stats.refacciones.sinStock}</span><span class="lbl">SIN EXISTENCIA</span></div>
      <div class="card"><span class="num">${stats.refacciones.revisadas}</span><span class="lbl">REVISADAS</span></div>
      <div class="card"><span class="num">${stats.refacciones.pendientes}</span><span class="lbl">PENDIENTES DE REVISAR</span></div>
    </div>
    ${seccion('Por fabricante', stats.refacciones.porFabricante, stats.refacciones.total)}
    ${seccion('Por ubicación', stats.refacciones.porUbicacion, stats.refacciones.total)}

    <h2>Movimientos de refacciones</h2>
    <div class="grid">
      <div class="card"><span class="num">${stats.movimientos.total}</span><span class="lbl">MOVIMIENTOS TOTALES</span></div>
      <div class="card"><span class="num">${stats.movimientos.entradas}</span><span class="lbl">ENTRADAS (${stats.movimientos.piezasEntradas} PZ)</span></div>
      <div class="card"><span class="num">${stats.movimientos.salidas}</span><span class="lbl">SALIDAS (${stats.movimientos.piezasSalidas} PZ)</span></div>
    </div>
    ${seccion('Refacciones con más movimientos', stats.movimientos.topRefacciones)}
    ${seccion('Usuarios más activos', stats.movimientos.topUsuarios)}

    <h2>Equipos</h2>
    <div class="grid">
      <div class="card"><span class="num">${stats.equipos.total}</span><span class="lbl">EQUIPOS REGISTRADOS</span></div>
      <div class="card"><span class="num">${stats.equipos.activos}</span><span class="lbl">ACTIVOS</span></div>
      <div class="card"><span class="num">${stats.equipos.conSalida}</span><span class="lbl">DADOS DE SALIDA</span></div>
      <div class="card"><span class="num">${stats.equipos.revisados}</span><span class="lbl">REVISADOS</span></div>
      <div class="card"><span class="num">${stats.equipos.pendientes}</span><span class="lbl">PENDIENTES DE REVISAR</span></div>
      <div class="card"><span class="num">${stats.equipos.movimientosTotal}</span><span class="lbl">MOVIMIENTOS DE REFACCIONES EN EQUIPOS</span></div>
    </div>
    ${seccion('Por clasificación', stats.equipos.porClasificacion, stats.equipos.total)}
    ${seccion('Salida por tipo', stats.equipos.porSalida, stats.equipos.conSalida)}

    <h2>Cajuelas de servicio</h2>
    <div class="grid">
      <div class="card"><span class="num">${stats.cajuelas.totalPiezas}</span><span class="lbl">PIEZAS EN INVENTARIO</span></div>
      <div class="card"><span class="num">${stats.cajuelas.movimientosTotal}</span><span class="lbl">MOVIMIENTOS TOTALES</span></div>
      <div class="card"><span class="num">${stats.cajuelas.entradas}</span><span class="lbl">ENTRADAS</span></div>
      <div class="card"><span class="num">${stats.cajuelas.salidas}</span><span class="lbl">SALIDAS DE USO</span></div>
      <div class="card"><span class="num">${stats.cajuelas.retirosActivos}</span><span class="lbl">CAJUELAS EN SERVICIO AHORA</span></div>
      <div class="card"><span class="num">${stats.cajuelas.retirosTotal}</span><span class="lbl">PRÉSTAMOS REGISTRADOS (HISTÓRICO)</span></div>
    </div>
    ${seccion('Piezas por cajuela', stats.cajuelas.porCajuela)}
    ${seccion('Motivos de uso más frecuentes', stats.cajuelas.topRazones, stats.cajuelas.salidas)}

    <h2>Otros módulos</h2>
    <div class="grid">
      <div class="card"><span class="num">${stats.ubicaciones.total}</span><span class="lbl">UBICACIONES REGISTRADAS</span></div>
      <div class="card"><span class="num">${stats.contactos.total}</span><span class="lbl">CONTACTOS REGISTRADOS</span></div>
      <div class="card"><span class="num">${stats.usuarios.total}</span><span class="lbl">USUARIOS DEL SISTEMA</span></div>
      <div class="card"><span class="num">${stats.galeria.categorias}</span><span class="lbl">CATEGORÍAS DE GALERÍA</span></div>
      <div class="card"><span class="num">${stats.galeria.subcategorias}</span><span class="lbl">SUBCATEGORÍAS DE GALERÍA</span></div>
      <div class="card"><span class="num">${stats.galeria.imagenes}</span><span class="lbl">FOTOS EN GALERÍA</span></div>
    </div>
    ${seccion('Usuarios por rol', stats.usuarios.porRol, stats.usuarios.total)}

    <p class="footer">Taller Soporte — Sistema interno de gestión de refacciones y equipos · Diagnóstica Internacional</p>
    <script>setTimeout(function(){window.print();},400);<\/script>
  </body></html>`;
}

export default function EstadisticasScreen({ navigation }) {
  const { perfil } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [stats, setStats] = useState(null);
  const [generando, setGenerando] = useState(false);

  useEffect(() => {
    if (!esAdmin(perfil)) { setLoading(false); return; }
    getEstadisticas()
      .then(data => setStats(calcularEstadisticas(data)))
      .catch(() => setError('No se pudieron cargar las estadísticas.'))
      .finally(() => setLoading(false));
  }, [perfil]);

  const descargarPDF = () => {
    if (!stats || Platform.OS !== 'web') return;
    setGenerando(true);
    try {
      const generadoEn = new Date().toLocaleDateString('es-MX', { day: 'numeric', month: 'long', year: 'numeric' });
      const win = window.open('', '_blank');
      if (!win) { setGenerando(false); return; }
      win.document.write(buildReporteHTML(stats, generadoEn));
      win.document.close();
    } catch {}
    setGenerando(false);
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.volverRow} onPress={() => navigation.goBack()}>
          <ArrowLeft size={14} color="rgba(255,255,255,0.7)" />
          <Text style={styles.volver}>Configuración</Text>
        </TouchableOpacity>
        <View style={styles.tituloRow}>
          <BarChart3 size={20} color="#fff" />
          <Text style={styles.titulo}>Estadísticas</Text>
        </View>
        <Text style={styles.sub}>Resumen general del sistema</Text>
      </View>

      {loading ? (
        <View style={styles.center}><ActivityIndicator size="large" color="#085686" /></View>
      ) : !esAdmin(perfil) ? (
        <View style={styles.center}>
          <Text style={styles.errorText}>Solo los administradores pueden ver las estadísticas.</Text>
        </View>
      ) : error ? (
        <View style={styles.center}><Text style={styles.errorText}>{error}</Text></View>
      ) : (
        <>
          <TouchableOpacity style={[styles.btnDescargar, styles.btnRow]} onPress={descargarPDF} disabled={generando}>
            {generando
              ? <ActivityIndicator color="#fff" size="small" />
              : <><Download size={16} color="#fff" /><Text style={styles.btnDescargarText}>Descargar PDF</Text></>
            }
          </TouchableOpacity>

          <ScrollView contentContainerStyle={{ padding: 14, paddingBottom: 60 }}>
            <Text style={styles.seccionTitulo}>REFACCIONES</Text>
            <View style={styles.tarjetasRow}>
              <Tarjeta numero={stats.refacciones.total} label="Registradas" />
              <Tarjeta numero={stats.refacciones.totalPiezas} label="Piezas en stock" />
              <Tarjeta numero={stats.refacciones.sinStock} label="Sin existencia" />
              <Tarjeta numero={stats.refacciones.pendientes} label="Pend. de revisar" />
            </View>
            <Text style={styles.subtituloTabla}>Por fabricante</Text>
            <TablaRanking filas={stats.refacciones.porFabricante} total={stats.refacciones.total} />
            <Text style={styles.subtituloTabla}>Por ubicación</Text>
            <TablaRanking filas={stats.refacciones.porUbicacion} total={stats.refacciones.total} />

            <Text style={styles.seccionTitulo}>MOVIMIENTOS</Text>
            <View style={styles.tarjetasRow}>
              <Tarjeta numero={stats.movimientos.total} label="Movimientos" />
              <Tarjeta numero={stats.movimientos.entradas} label="Entradas" />
              <Tarjeta numero={stats.movimientos.salidas} label="Salidas" />
            </View>
            <Text style={styles.subtituloTabla}>Refacciones con más movimientos</Text>
            <TablaRanking filas={stats.movimientos.topRefacciones} />
            <Text style={styles.subtituloTabla}>Usuarios más activos</Text>
            <TablaRanking filas={stats.movimientos.topUsuarios} />

            <Text style={styles.seccionTitulo}>EQUIPOS</Text>
            <View style={styles.tarjetasRow}>
              <Tarjeta numero={stats.equipos.total} label="Registrados" />
              <Tarjeta numero={stats.equipos.activos} label="Activos" />
              <Tarjeta numero={stats.equipos.conSalida} label="Dados de salida" />
              <Tarjeta numero={stats.equipos.pendientes} label="Pend. de revisar" />
            </View>
            <Text style={styles.subtituloTabla}>Por clasificación</Text>
            <TablaRanking filas={stats.equipos.porClasificacion} total={stats.equipos.total} />

            <Text style={styles.seccionTitulo}>CAJUELAS DE SERVICIO</Text>
            <View style={styles.tarjetasRow}>
              <Tarjeta numero={stats.cajuelas.totalPiezas} label="Piezas en inventario" />
              <Tarjeta numero={stats.cajuelas.movimientosTotal} label="Movimientos" />
              <Tarjeta numero={stats.cajuelas.retirosActivos} label="En servicio ahora" />
            </View>
            <Text style={styles.subtituloTabla}>Piezas por cajuela</Text>
            <TablaRanking filas={stats.cajuelas.porCajuela} />
            <Text style={styles.subtituloTabla}>Motivos de uso más frecuentes</Text>
            <TablaRanking filas={stats.cajuelas.topRazones} total={stats.cajuelas.salidas} />

            <Text style={styles.seccionTitulo}>OTROS MÓDULOS</Text>
            <View style={styles.tarjetasRow}>
              <Tarjeta numero={stats.ubicaciones.total} label="Ubicaciones" />
              <Tarjeta numero={stats.contactos.total} label="Contactos" />
              <Tarjeta numero={stats.usuarios.total} label="Usuarios" />
              <Tarjeta numero={stats.galeria.imagenes} label="Fotos en galería" />
            </View>
          </ScrollView>
        </>
      )}
    </View>
  );
}

const AZUL = '#085686'; // DISA blue
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#EEF2F7' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  errorText: { color: '#C62828', fontSize: 14, textAlign: 'center', padding: 20 },
  header: { backgroundColor: AZUL, padding: 18, paddingTop: 50 },
  volverRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginBottom: 10 },
  volver: { color: 'rgba(255,255,255,0.7)', fontSize: 14 },
  tituloRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  titulo: { fontSize: 22, fontWeight: '800', color: '#fff' },
  sub: { fontSize: 12, color: 'rgba(255,255,255,0.7)', marginTop: 4 },
  btnRow: { flexDirection: 'row', justifyContent: 'center', gap: 8 },
  btnDescargar: { backgroundColor: '#1976D2', margin: 14, marginBottom: 0, borderRadius: 12, padding: 14, alignItems: 'center' },
  btnDescargarText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  seccionTitulo: { fontSize: 12, fontWeight: '800', color: '#555', letterSpacing: 0.5, marginTop: 22, marginBottom: 10 },
  subtituloTabla: { fontSize: 12, fontWeight: '700', color: '#888', marginTop: 12, marginBottom: 6 },
  tarjetasRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  tarjeta: { flexBasis: '47%', flexGrow: 1, backgroundColor: '#fff', borderRadius: 12, padding: 14, shadowColor: '#000', shadowOpacity: 0.05, elevation: 2 },
  tarjetaNum: { fontSize: 24, fontWeight: '800', color: AZUL },
  tarjetaLabel: { fontSize: 11, color: '#888', marginTop: 2 },
  sinDatos: { color: '#aaa', fontSize: 13, fontStyle: 'italic' },
  tabla: { backgroundColor: '#fff', borderRadius: 12, overflow: 'hidden' },
  tablaFila: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#f0f0f0' },
  tablaNombre: { flex: 1, fontSize: 13, color: '#1a1a2e', fontWeight: '600', marginRight: 8 },
  tablaValor: { fontSize: 13, color: AZUL, fontWeight: '700' },
});
