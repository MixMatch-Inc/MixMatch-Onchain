#![no_std]

mod rbac;
use rbac::Role;

use soroban_sdk::{
    contract, contractimpl, contracttype, log, Address, Env, Map, String, Vec,
};

#[contracttype]
#[derive(Clone, Debug, PartialEq)]
pub struct Service {
    pub id: u32,
    pub name: String,
    pub description: String,
    pub price: i128,
    pub is_active: bool,
}

#[contracttype]
enum DataKey {
    Services,
    NextId,
}

#[contract]
pub struct ServiceCatalogContract;

#[contractimpl]
impl ServiceCatalogContract {
    pub fn initialize(env: Env, admin: Address) {
        if env.storage().instance().has(&DataKey::Services) {
            panic!("Already initialized");
        }
        rbac::initialize_admin(&env, &admin);
        env.storage().instance().set(&DataKey::Services, &Map::<u32, Service>::new(&env));
        env.storage().instance().set(&DataKey::NextId, &0u32);
    }

    pub fn add_service(
        env: Env,
        name: String,
        description: String,
        price: i128,
        is_active: bool,
    ) -> u32 {
        let admin = env.invoker();
        admin.require_auth();
        rbac::require_role(&env, &admin, Role::Admin);

        let mut next_id: u32 = env.storage().instance().get(&DataKey::NextId).unwrap();
        let service = Service { id: next_id, name, description, price, is_active };

        let mut services = env.storage().instance().get(&DataKey::Services).unwrap();
        services.set(next_id, service);
        env.storage().instance().set(&DataKey::Services, &services);

        env.storage().instance().set(&DataKey::NextId, &(next_id + 1));
        log!(&env, "Added service with ID: {}", next_id);
        next_id
    }

    pub fn update_service(
        env: Env,
        id: u32,
        name: String,
        description: String,
        price: i128,
        is_active: bool,
    ) {
        let admin = env.invoker();
        admin.require_auth();
        rbac::require_role(&env, &admin, Role::Admin);

        let mut services: Map<u32, Service> = env.storage().instance().get(&DataKey::Services).unwrap();
        if !services.contains_key(id) {
            panic!("Service with this ID does not exist");
        }

        let updated_service = Service { id, name, description, price, is_active };
        services.set(id, updated_service);
        env.storage().instance().set(&DataKey::Services, &services);
        log!(&env, "Updated service with ID: {}", id);
    }

    pub fn get_service(env: Env, id: u32) -> Service {
        let services: Map<u32, Service> = env.storage().instance().get(&DataKey::Services).unwrap();
        services.get(id).expect("Service not found")
    }

    pub fn get_active_services(env: Env) -> Vec<Service> {
        let services: Map<u32, Service> = env.storage().instance().get(&DataKey::Services).unwrap();
        let mut active_services = Vec::new(&env);
        for service in services.values() {
            if service.is_active {
                active_services.push_back(service);
            }
        }
        active_services
    }
}