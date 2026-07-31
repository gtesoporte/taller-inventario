import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useAuth } from '../context/AuthContext';

import LoginScreen from './LoginScreen';
import PartesScreen from './PartesScreen';
import AcondicionamientoScreen from './AcondicionamientoScreen';
import MovimientosScreen from './MovimientosScreen';
import AdminScreen from './AdminScreen';
import ConfigScreen from './ConfigScreen';
import DetalleParteScreen from './DetalleParteScreen';
import DetalleAcondScreen from './DetalleAcondScreen';
import UbicacionesScreen from './UbicacionesScreen';
import EscanearQRScreen from './EscanearQRScreen';
import BusquedaVozScreen from './BusquedaVozScreen';
import FormParteScreen from './FormParteScreen';
import FabricantesScreen from './FabricantesScreen';
import EquiposScreen from './EquiposScreen';
import FormEquipoScreen from './FormEquipoScreen';
import DetalleEquipoScreen from './DetalleEquipoScreen';
import CajuelasScreen from './CajuelasScreen';
import DetalleCajuelaScreen from './DetalleCajuelaScreen';
import GaleriaScreen from './GaleriaScreen';
import DetalleCategoriaGaleriaScreen from './DetalleCategoriaGaleriaScreen';
import DetalleSubcategoriaGaleriaScreen from './DetalleSubcategoriaGaleriaScreen';

const Tab = createBottomTabNavigator();
// native-stack (no el stack JS) es obligatorio en web: el otro no propaga
// height:100% a las pantallas, así que ninguna lista podía hacer scroll.
const Stack = createNativeStackNavigator();

const TAB_OPTS = {
  headerShown: false,
  // La navegación entre secciones ahora vive en el menú lateral (☰), no en una
  // barra de pestañas — con 7 secciones se veía amontonada en celular.
  tabBarStyle: { display: 'none' },
};

function PartesStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="PartesLista" component={PartesScreen} />
      <Stack.Screen name="DetalleParte" component={DetalleParteScreen} />
      <Stack.Screen name="Ubicaciones" component={UbicacionesScreen} />
      <Stack.Screen name="EscanearQR" component={EscanearQRScreen} />
      <Stack.Screen name="BusquedaVoz" component={BusquedaVozScreen} />
      <Stack.Screen name="FormParte" component={FormParteScreen} />
      <Stack.Screen name="EquiposLista" component={EquiposScreen} />
      <Stack.Screen name="FormEquipo" component={FormEquipoScreen} />
      <Stack.Screen name="DetalleEquipo" component={DetalleEquipoScreen} />
    </Stack.Navigator>
  );
}

function AcondStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="AcondLista" component={AcondicionamientoScreen} />
      <Stack.Screen name="DetalleAcond" component={DetalleAcondScreen} />
    </Stack.Navigator>
  );
}

function MovStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="MovLista" component={MovimientosScreen} />
    </Stack.Navigator>
  );
}

function CajuelasStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="CajuelasLista" component={CajuelasScreen} />
      <Stack.Screen name="DetalleCajuela" component={DetalleCajuelaScreen} />
    </Stack.Navigator>
  );
}

function GaleriaStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="GaleriaLista" component={GaleriaScreen} />
      <Stack.Screen name="DetalleCategoriaGaleria" component={DetalleCategoriaGaleriaScreen} />
      <Stack.Screen name="DetalleSubcategoriaGaleria" component={DetalleSubcategoriaGaleriaScreen} />
    </Stack.Navigator>
  );
}

function ConfigStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="ConfigMain" component={ConfigScreen} />
      <Stack.Screen name="Fabricantes" component={FabricantesScreen} />
    </Stack.Navigator>
  );
}

function MainTabs() {
  return (
    <Tab.Navigator screenOptions={TAB_OPTS}>
      <Tab.Screen name="Inventario" component={PartesStack} />
      <Tab.Screen name="Proyectos" component={AcondStack} />
      <Tab.Screen name="Movimientos" component={MovStack} />
      <Tab.Screen name="Cajuelas" component={CajuelasStack} />
      <Tab.Screen name="Galería" component={GaleriaStack} />
      <Tab.Screen name="Config" component={ConfigStack} />
      <Tab.Screen name="Admin" component={AdminScreen} />
    </Tab.Navigator>
  );
}

export default function Navigation() {
  const { user, loading } = useAuth();
  if (loading) return null;

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {user
          ? <Stack.Screen name="Main" component={MainTabs} />
          : <Stack.Screen name="Login" component={LoginScreen} />
        }
      </Stack.Navigator>
    </NavigationContainer>
  );
}
