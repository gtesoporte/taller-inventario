export const ROLES_ADMIN = ['Administrador', 'Superadministrador'];

export const esAdmin = (perfil) => ROLES_ADMIN.includes(perfil?.rol);
