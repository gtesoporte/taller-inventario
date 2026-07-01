import React, { useState } from 'react';
import { Modal, View, Image, TouchableOpacity, StyleSheet, Text } from 'react-native';

export default function ImagenViewer({ uri, children, style, resizeMode = 'cover' }) {
  const [open, setOpen] = useState(false);
  if (!uri) return children || null;
  return (
    <>
      <TouchableOpacity onPress={() => setOpen(true)} activeOpacity={0.88}>
        {children || <Image source={{ uri }} style={style} resizeMode={resizeMode} />}
      </TouchableOpacity>
      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <TouchableOpacity style={styles.overlay} onPress={() => setOpen(false)} activeOpacity={1}>
          <Image source={{ uri }} style={styles.imgFull} resizeMode="contain" />
          <View style={styles.closeBtn}>
            <Text style={styles.closeTxt}>✕  Cerrar</Text>
          </View>
        </TouchableOpacity>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.93)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  imgFull: { width: '100%', height: '100%' },
  closeBtn: {
    position: 'absolute',
    top: 48,
    right: 20,
    backgroundColor: 'rgba(255,255,255,0.18)',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  closeTxt: { color: '#fff', fontSize: 14, fontWeight: '700' },
});
