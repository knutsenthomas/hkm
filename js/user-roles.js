// User Role Constants & Permissions
const ROLES = {
    MEDLEM: 'medlem',
    EDITOR: 'editor',
    ADMIN: 'admin',
    SUPERADMIN: 'superadmin'
};

const PERMISSIONS = {
    ACCESS_MINSIDE: [ROLES.MEDLEM, ROLES.EDITOR, ROLES.ADMIN, ROLES.SUPERADMIN],
    ACCESS_ADMIN: [ROLES.EDITOR, ROLES.ADMIN, ROLES.SUPERADMIN],
    MANAGE_BLOG: [ROLES.EDITOR, ROLES.ADMIN, ROLES.SUPERADMIN],
    MANAGE_CONTENT: [ROLES.ADMIN, ROLES.SUPERADMIN], // Pages, Hero, etc.
    MANAGE_USERS: [ROLES.ADMIN, ROLES.SUPERADMIN],
    MANAGE_SETTINGS: [ROLES.ADMIN, ROLES.SUPERADMIN],
    DELETE_ANYTHING: [ROLES.SUPERADMIN], // Only Super Admin can delete everything
    DELETE_CONTENT: [ROLES.ADMIN, ROLES.SUPERADMIN], // Admin can delete content but maybe not system stuff
    EDIT_ROLES: [ROLES.SUPERADMIN] // Only Super Admin can change user roles to Admin/SuperAdmin
};

window.HKM_ROLES = ROLES;
window.HKM_PERMISSIONS = PERMISSIONS;
