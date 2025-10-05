use soroban_sdk::{contracttype, Address, Env, Map};

use soroban_sdk::{
    contract, contractimpl, contracttype, log, token, Address, Env, Map, String,
};

mod rbac;
use rbac::Role;


#[contracttype]
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum Role { Admin }

#[contracttype]
enum DataKey { Roles }

pub fn initialize_admin(env: &Env, admin: &Address) {
    let mut roles: Map<Address, Role> = Map::new(env);
    roles.set(admin.clone(), Role::Admin);
    env.storage().instance().set(&DataKey::Roles, &roles);
}

pub fn require_role(env: &Env, user: &Address, role: Role) {
    let roles: Map<Address, Role> = env.storage().instance().get(&DataKey::Roles).unwrap();
    if roles.get(user.clone()) != Some(role) {
        panic!("User does not have the required role");
    }
}

#[contracttype]
#[derive(Clone, Debug, PartialEq)]
pub struct Plan {
    pub name: String,
    pub price: i128,
    pub duration: u64, // in seconds
}

#[contracttype]
#[derive(Clone, Debug, PartialEq)]
pub struct Subscription {
    pub plan_id: u32,
    pub end_time: u64,
}

#[contracttype]
pub enum SubscriptionStatus { Active, Expired }

#[contracttype]
enum DataKey {
    Plans,
    Subscriptions,
    NextPlanId,
}

#[contract]
pub struct TieredSubscriptionContract;

#[contractimpl]
impl TieredSubscriptionContract {
    pub fn initialize(env: Env, admin: Address) {
        if env.storage().instance().has(&DataKey::Plans) {
            panic!("Already initialized");
        }
        rbac::initialize_admin(&env, &admin);
        env.storage().instance().set(&DataKey::Plans, &Map::<u32, Plan>::new(&env));
        env.storage().instance().set(&DataKey::Subscriptions, &Map::<Address, Subscription>::new(&env));
        env.storage().instance().set(&DataKey::NextPlanId, &0u32);
    }

    pub fn define_plan(env: Env, name: String, price: i128, duration: u64) -> u32 {
        let admin = env.invoker();
        admin.require_auth();
        rbac::require_role(&env, &admin, Role::Admin);

        let plan = Plan { name, price, duration };
        let mut next_id: u32 = env.storage().instance().get(&DataKey::NextPlanId).unwrap();
        let mut plans: Map<u32, Plan> = env.storage().instance().get(&DataKey::Plans).unwrap();
        
        plans.set(next_id, plan);
        env.storage().instance().set(&DataKey::Plans, &plans);
        env.storage().instance().set(&DataKey::NextPlanId, &(next_id + 1));
        
        log!(&env, "Defined plan ID {}: {}", next_id, name);
        next_id
    }

    pub fn subscribe(env: Env, patient: Address, plan_id: u32, asset: Address) {
        patient.require_auth();

        let plans: Map<u32, Plan> = env.storage().instance().get(&DataKey::Plans).unwrap();
        let plan_to_join = plans.get(plan_id).expect("Plan does not exist");
        
        let admin = env.storage().instance().get(&rbac::DataKey::Roles).unwrap_or(Map::new(&env)).keys().get(0).unwrap();
        let token_client = token::Client::new(&env, &asset);
        token_client.transfer(&patient, &admin, &plan_to_join.price);

        let mut subscriptions: Map<Address, Subscription> = env.storage().instance().get(&DataKey::Subscriptions).unwrap();
        let current_time = env.ledger().timestamp();
        
        let new_subscription = Subscription {
            plan_id,
            end_time: current_time + plan_to_join.duration,
        };
        
        subscriptions.set(patient, new_subscription);
        env.storage().instance().set(&DataKey::Subscriptions, &subscriptions);
    }

    pub fn get_status(env: Env, patient: Address) -> SubscriptionStatus {
        let subscriptions: Map<Address, Subscription> = env.storage().instance().get(&DataKey::Subscriptions).unwrap();
        match subscriptions.get(patient) {
            Some(sub) => {
                if env.ledger().timestamp() > sub.end_time {
                    SubscriptionStatus::Expired
                } else {
                    SubscriptionStatus::Active
                }
            }
            None => SubscriptionStatus::Expired,
        }
    }

    pub fn get_patient_plan(env: Env, patient: Address) -> Option<Plan> {
        let subscriptions: Map<Address, Subscription> = env.storage().instance().get(&DataKey::Subscriptions).unwrap();
        if let Some(sub) = subscriptions.get(patient) {
            let plans: Map<u32, Plan> = env.storage().instance().get(&DataKey::Plans).unwrap();
            plans.get(sub.plan_id)
        } else {
            None
        }
    }
}