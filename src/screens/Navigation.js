import React from 'react';
import { Text } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
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

const Tab = createBottomTabNavigator();
const Stack = createStackNavigator();

const AZUL = '#0B2447';
const TAB_OPTS = {
  headerShown: false,
  tabBarStyle: { backgroundColor: AZUL, borderTopColor: 'rgba(255,255,255,0.1)', height: 62, paddingBottom: 8 },
  tabBarActiveTintColor: '#60A5FA',
  tabBarInactiveTintColor: 'rgba(255,255,255,0.45)',
  tabBarLabelStyle: { fontSize: 11, fontWeight: '600' },
};

function PartesStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="PartesLista" component={PartesScreen} />
      <Stack.Screen name="DetalleParte" component={DetalleParteScreen} />
      <Stack.Screen name="Ubicaciones" component={UbicacionesScreen} />
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

function MainTabs() {
  return (
    <Tab.Navigator screenOptions={TAB_OPTS}>
      <Tab.Screen
        name="Inventario"
        component={PartesStack}
        options={{ tabBarIcon: ({ color }) => <Text style={{ fontSize: 22, color }}>📦</Text> }}
      />
      <Tab.Screen
        name="Proyectos"
        component={AcondStack}
        options={{ tabBarIcon: ({ color }) => <Text style={{ fontSize: 22, color }}>🔧</Text> }}
      />
      <Tab.Screen
        name="Movimientos"
        component={MovStack}
        options={{ tabBarIcon: ({ color }) => <Text style={{ fontSize: 22, color }}>📋</Text> }}
      />
      <Tab.Screen
        name="Config"
        component={ConfigScreen}
        options={{ headerShown: false, tabBarIcon: ({ color }) => <Text style={{ fontSize: 22, color }}>⚙️</Text> }}
      />
      <Tab.Screen
        name="Admin"
        component={AdminScreen}
        options={{ headerShown: false, tabBarIcon: ({ color }) => <Text style={{ fontSize: 22, color }}>👑</Text> }}
      />
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
