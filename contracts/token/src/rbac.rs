


use soroban_sdk::{contracttype, Address, Env, Map, Symbol};


#[contracttype]
#[derive(Clone, Copy, Debug, PartialEq, Eq, PartialOrd, Ord)]
pub enum Role {
    Admin,
    Doctor,
}

#[contracttype]
#[derive(Clone)]
enum DataKey {
    Roles,
}


pub fn initialize_admin(env: &Env, admin: &Address) {
    let mut roles: Map<Address, Role> = Map::new(env);
    roles.set(admin.clone(), Role::Admin);
    env.storage().instance().set(&DataKey::Roles, &roles);
}

pub fn has_role(env: &Env, user: &Address, role: Role) -> bool {
    let roles: Map<Address, Role> = env.storage().instance().get(&DataKey::Roles).unwrap();
    roles.get(user.clone()).map_or(false, |user_role| user_role == role)
}

pub fn require_role(env: &Env, user: &Address, role: Role) {
    if !has_role(env, user, role) {
        panic!("User does not have the required role");
    }
}

pub fn grant_role(env: &Env, admin: &Address, user: &Address, role: Role) {

    require_role(env, admin, Role::Admin);
    admin.require_auth();

    let mut roles: Map<Address, Role> = env.storage().instance().get(&DataKey::Roles).unwrap();
    roles.set(user.clone(), role);
    env.storage().instance().set(&DataKey::Roles, &roles);
}

pub fn revoke_role(env: &Env, admin: &Address, user: &Address) {
    require_role(env, admin, Role::Admin);
    admin.require_auth();

    let mut roles: Map<Address, Role> = env.storage().instance().get(&DataKey::Roles).unwrap();
    roles.remove(user.clone());
    env.storage().instance().set(&DataKey::Roles, &roles);
}

pub fn get_role(env: &Env, user: &Address) -> Option<Role> {
    let roles: Map<Address, Role> = env.storage().instance().get(&DataKey::Roles).unwrap();
    roles.get(user.clone())
}